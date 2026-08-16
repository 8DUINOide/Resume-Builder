from flask import Blueprint, request, jsonify, send_file
from firebase_init import db
from firebase_admin import auth
from resume_generator import ResumeGenerator
import datetime
import random
import string
import os
from config import Config

api_bp = Blueprint('api', __name__)

# Initialize resume generator
resume_gen = ResumeGenerator()

def verify_firebase_token(id_token):
    """Verify Firebase ID token and return user info"""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

def get_user_role(uid):
    """Get user role from Firestore"""
    try:
        user_doc = db.collection('users').document(uid).get()
        if user_doc.exists:
            return user_doc.to_dict().get('role', 'CUSTOMER')
        return 'CUSTOMER'
    except Exception as e:
        print(f"Error getting user role: {e}")
        return 'CUSTOMER'

def generate_ref_id():
    """Generate unique reference ID"""
    timestamp = datetime.datetime.now().strftime('%Y%m%d')
    random_str = ''.join(random.choices(string.digits, k=4))
    return f"REF-{timestamp}-{random_str}"

def check_daily_edit_limit(uid):
    """Check if user has exceeded daily edit limit"""
    try:
        user_doc = db.collection('users').document(uid).get()
        if not user_doc.exists:
            return True, 0
        
        user_data = user_doc.to_dict()
        daily_edits = user_data.get('dailyEdits', {})
        
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        last_edit_date = daily_edits.get('date', '')
        edit_count = daily_edits.get('count', 0)
        
        if last_edit_date != today:
            return True, 0  # New day, reset count
        
        return edit_count < Config.MAX_DAILY_EDITS, edit_count
    except Exception as e:
        print(f"Error checking edit limit: {e}")
        return True, 0

def increment_daily_edit_count(uid):
    """Increment user's daily edit count"""
    try:
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            daily_edits = user_data.get('dailyEdits', {})
            
            if daily_edits.get('date') != today:
                daily_edits = {'date': today, 'count': 1}
            else:
                daily_edits['count'] = daily_edits.get('count', 0) + 1
            
            user_ref.update({'dailyEdits': daily_edits})
        else:
            user_ref.set({
                'dailyEdits': {'date': today, 'count': 1}
            })
    except Exception as e:
        print(f"Error incrementing edit count: {e}")

@api_bp.route('/create-order', methods=['POST'])
def create_order():
    """Create a new resume order"""
    try:
        data = request.json
        id_token = data.get('idToken')
        
        if not id_token:
            return jsonify({'error': 'No authentication token provided'}), 401
        
        user_info = verify_firebase_token(id_token)
        if not user_info:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        uid = user_info['uid']
        email = user_info.get('email', '')
        display_name = user_info.get('name', '')
        
        # Ensure user exists in Firestore with correct role
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            user_ref.set({
                'email': email,
                'displayName': display_name,
                'role': 'CUSTOMER',
                'dailyEdits': {'date': datetime.datetime.now().strftime('%Y-%m-%d'), 'count': 0}
            })
        
        # Generate reference ID
        ref_id = generate_ref_id()
        
        # Create order document
        order_data = {
            'refId': ref_id,
            'customerId': uid,
            'customerEmail': email,
            'customerName': display_name,
            'status': 'PENDING',
            'templateType': data.get('templateType', 'ats_classic'),
            'resumeData': data.get('resumeData', {}),
            'createdAt': datetime.datetime.now().isoformat(),
            'fulfilledAt': None,
            'pdfStorageUrl': None
        }
        
        order_ref = db.collection('orders').add(order_data)
        
        return jsonify({
            'success': True,
            'refId': ref_id,
            'orderId': order_ref[1].id
        }), 200
        
    except Exception as e:
        print(f"Error creating order: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/orders', methods=['GET'])
def get_orders():
    """Get orders (admin only)"""
    try:
        id_token = request.headers.get('Authorization')
        if not id_token:
            return jsonify({'error': 'No authentication token provided'}), 401
        
        # Remove 'Bearer ' prefix if present
        if id_token.startswith('Bearer '):
            id_token = id_token[7:]
        
        user_info = verify_firebase_token(id_token)
        if not user_info:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        uid = user_info['uid']
        role = get_user_role(uid)
        
        if role != 'ADMIN':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get query parameters
        date_filter = request.args.get('date')
        ref_id = request.args.get('refId')
        
        orders_ref = db.collection('orders')
        
        if ref_id:
            orders_ref = orders_ref.where('refId', '==', ref_id)
        elif date_filter:
            # Filter by date (compare date part of createdAt)
            orders_ref = orders_ref.where('createdAt', '>=', f"{date_filter}T00:00:00")
            orders_ref = orders_ref.where('createdAt', '<=', f"{date_filter}T23:59:59")
        
        orders = orders_ref.order_by('createdAt', direction='DESCENDING').get()
        
        orders_list = []
        for order in orders:
            order_data = order.to_dict()
            order_data['orderId'] = order.id
            orders_list.append(order_data)
        
        return jsonify({'orders': orders_list}), 200
        
    except Exception as e:
        print(f"Error getting orders: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/update-resume', methods=['PUT'])
def update_resume():
    """Update resume data"""
    try:
        data = request.json
        id_token = data.get('idToken')
        order_id = data.get('orderId')
        resume_data = data.get('resumeData')
        
        if not id_token or not order_id or not resume_data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        user_info = verify_firebase_token(id_token)
        if not user_info:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        uid = user_info['uid']
        role = get_user_role(uid)
        
        # Check edit limit for customers
        if role == 'CUSTOMER':
            can_edit, current_count = check_daily_edit_limit(uid)
            if not can_edit:
                return jsonify({
                    'error': f'Daily edit limit exceeded ({Config.MAX_DAILY_EDITS} edits per day)',
                    'currentCount': current_count,
                    'maxEdits': Config.MAX_DAILY_EDITS
                }), 429
            
            # Increment edit count
            increment_daily_edit_count(uid)
        
        # Update order
        order_ref = db.collection('orders').document(order_id)
        order_doc = order_ref.get()
        
        if not order_doc.exists:
            return jsonify({'error': 'Order not found'}), 404
        
        # Verify customer can only edit their own orders
        if role == 'CUSTOMER':
            order_data = order_doc.to_dict()
            if order_data.get('customerId') != uid:
                return jsonify({'error': 'Unauthorized to edit this order'}), 403
        
        order_ref.update({'resumeData': resume_data})
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        print(f"Error updating resume: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/fulfill-order', methods=['POST'])
def fulfill_order():
    """Fulfill order and generate PDF (admin only)"""
    try:
        data = request.json
        id_token = data.get('idToken')
        order_id = data.get('orderId')
        
        if not id_token or not order_id:
            return jsonify({'error': 'Missing required fields'}), 400
        
        user_info = verify_firebase_token(id_token)
        if not user_info:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        uid = user_info['uid']
        role = get_user_role(uid)
        
        if role != 'ADMIN':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get order
        order_ref = db.collection('orders').document(order_id)
        order_doc = order_ref.get()
        
        if not order_doc.exists:
            return jsonify({'error': 'Order not found'}), 404
        
        order_data = order_doc.to_dict()
        
        # Generate PDF
        template_type = order_data.get('templateType', 'ats_classic')
        resume_data = order_data.get('resumeData', {})
        ref_id = order_data.get('refId', 'unknown')
        
        # Ensure output directory exists
        os.makedirs(Config.PDF_OUTPUT_DIR, exist_ok=True)
        
        pdf_filename = f"{ref_id}.pdf"
        pdf_path = os.path.join(Config.PDF_OUTPUT_DIR, pdf_filename)
        
        # Generate PDF based on template type
        if template_type == 'ats_classic':
            resume_gen.build_ats_classic(resume_data, pdf_path)
        elif template_type == 'canva_modern_1':
            resume_gen.build_canva_modern_1(resume_data, pdf_path)
        elif template_type == 'canva_creative_2':
            resume_gen.build_canva_creative_2(resume_data, pdf_path)
        elif template_type == 'canva_minimal_3':
            resume_gen.build_canva_minimal_3(resume_data, pdf_path)
        elif template_type == 'canva_executive_4':
            resume_gen.build_canva_executive_4(resume_data, pdf_path)
        else:
            resume_gen.build_ats_classic(resume_data, pdf_path)
        
        # Update order status
        pdf_url = f"/generated_pdfs/{pdf_filename}"
        order_ref.update({
            'status': 'FULFILLED',
            'fulfilledAt': datetime.datetime.now().isoformat(),
            'pdfStorageUrl': pdf_url
        })
        
        return jsonify({
            'success': True,
            'pdfUrl': pdf_url
        }), 200
        
    except Exception as e:
        print(f"Error fulfilling order: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/download-resume/<ref_id>', methods=['GET'])
def download_resume(ref_id):
    """Download resume PDF"""
    try:
        # Find order by ref ID
        orders = db.collection('orders').where('refId', '==', ref_id).get()
        
        if not orders:
            return jsonify({'error': 'Order not found'}), 404
        
        order = list(orders)[0]
        order_data = order.to_dict()
        
        # Check if order is fulfilled
        if order_data.get('status') != 'FULFILLED':
            return jsonify({'error': 'Order not fulfilled yet'}), 403
        
        pdf_url = order_data.get('pdfStorageUrl')
        if not pdf_url:
            return jsonify({'error': 'PDF not generated'}), 404
        
        # Extract filename from URL
        pdf_filename = pdf_url.split('/')[-1]
        pdf_path = os.path.join(Config.PDF_OUTPUT_DIR, pdf_filename)
        
        if not os.path.exists(pdf_path):
            return jsonify({'error': 'PDF file not found'}), 404
        
        return send_file(pdf_path, as_attachment=True, download_name=f"{ref_id}.pdf")
        
    except Exception as e:
        print(f"Error downloading resume: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/save-draft', methods=['POST'])
def save_draft():
    """Auto-save draft to Firestore"""
    try:
        data = request.json
        id_token = data.get('idToken')
        draft_data = data.get('draftData')
        
        if not id_token or not draft_data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        user_info = verify_firebase_token(id_token)
        if not user_info:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        uid = user_info['uid']
        
        # Save draft to Firestore
        draft_ref = db.collection('users').document(uid).collection('drafts').document('active')
        draft_ref.set({
            'data': draft_data,
            'updatedAt': datetime.datetime.now().isoformat()
        })
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        print(f"Error saving draft: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/load-draft', methods=['GET'])
def load_draft():
    """Load draft from Firestore"""
    try:
        id_token = request.headers.get('Authorization')
        if not id_token:
            return jsonify({'error': 'No authentication token provided'}), 401
        
        if id_token.startswith('Bearer '):
            id_token = id_token[7:]
        
        user_info = verify_firebase_token(id_token)
        if not user_info:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        uid = user_info['uid']
        
        # Load draft from Firestore
        draft_ref = db.collection('users').document(uid).collection('drafts').document('active')
        draft_doc = draft_ref.get()
        
        if draft_doc.exists:
            draft_data = draft_doc.to_dict()
            return jsonify({'draft': draft_data.get('data', {})}), 200
        else:
            return jsonify({'draft': {}}), 200
        
    except Exception as e:
        print(f"Error loading draft: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/upload-photo', methods=['POST'])
def upload_photo():
    """Upload profile photo"""
    try:
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo file provided'}), 400
        
        photo = request.files['photo']
        
        if photo.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Generate unique filename
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        filename = f"photo_{timestamp}_{photo.filename}"
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        
        # Save file
        photo.save(filepath)
        
        # Return URL
        photo_url = f"/uploads/{filename}"
        
        return jsonify({'success': True, 'photoUrl': photo_url}), 200
        
    except Exception as e:
        print(f"Error uploading photo: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/user-role', methods=['GET'])
def get_user_role_endpoint():
    """Get current user's role"""
    try:
        id_token = request.headers.get('Authorization')
        if not id_token:
            return jsonify({'error': 'No authentication token provided'}), 401
        
        if id_token.startswith('Bearer '):
            id_token = id_token[7:]
        
        user_info = verify_firebase_token(id_token)
        if not user_info:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        uid = user_info['uid']
        role = get_user_role(uid)
        
        return jsonify({'role': role}), 200
        
    except Exception as e:
        print(f"Error getting user role: {e}")
        return jsonify({'error': str(e)}), 500
