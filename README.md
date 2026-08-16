# Resume Builder - Shop Implementation

A comprehensive in-shop, real-time auto-saving resume generation platform powered by Firebase (Auth & Firestore), ReportLab/Pillow, and Canva Template Integrations.

## 🏗️ Features

- **Google Sign-In Authentication** with role-based access (Customer/Admin)
- **Real-time Auto-Save** draft mechanism using Firestore
- **Multi-step Resume Builder** with structured forms
- **5 Professional Templates** (1 ATS + 4 Canva designs)
- **Photo Upload** with Pillow integration for PDF embedding
- **Admin Dashboard** with date filtering and order management
- **Customer Dashboard** with order tracking and download functionality
- **Daily Edit Limits** (5 edits/day for customers, unlimited for admins)
- **QR Code Generation** for shop order reference
- **PDF Generation** using ReportLab with multiple template styles

## 📋 Prerequisites

- Python 3.8 or higher
- Firebase account with Google Sign-In enabled
- Firebase project with Firestore database
- Firebase service account key

## 🚀 Setup Instructions

### 1. Firebase Project Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" and follow the setup wizard
   - Enable Google Sign-In in Authentication > Sign-in method

2. **Setup Firestore Database**
   - Go to Firestore Database in Firebase Console
   - Click "Create database"
   - Choose production mode or test mode
   - Select a location (e.g., us-central)

3. **Create Firestore Collections**
   The following collections will be automatically created by the application:
   - `users/{uid}` - User profiles with roles and edit counts
   - `users/{uid}/drafts/active` - Auto-saved drafts
   - `orders/{orderId}` - Resume orders with status tracking

4. **Generate Service Account Key**
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file securely
   - Copy the contents to your `.env` file

### 2. Environment Configuration

1. **Copy environment template**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your Firebase credentials:

   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-content\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-client-email@your-project-id.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-client-email%40your-project-id.iam.gserviceaccount.com

   # Firebase Web SDK Configuration (for frontend)
   FIREBASE_API_KEY=your-api-key
   FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
   FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   FIREBASE_APP_ID=your-app-id

   # Flask Configuration
   FLASK_SECRET_KEY=your-secret-key
   FLASK_ENV=development
   ```

3. **Update Firebase Config in Frontend**
   - Edit `static/js/app.js`
   - Replace the `firebaseConfig` object with your actual Firebase project configuration
   - You can find this in Firebase Console > Project Settings > General > Your apps

### 3. Python Dependencies Installation

```bash
pip install -r requirements.txt
```

### 4. Create Required Directories

```bash
mkdir -p uploads generated_pdfs
```

### 5. Set Up Admin User

To create an admin user, you'll need to manually update the Firestore database:

1. Sign in with Google through the app first
2. Go to Firebase Console > Firestore Database
3. Find your user in the `users` collection
4. Update the `role` field to `"ADMIN"`

```javascript
// In Firestore Console, set:
users/{your-uid}/role = "ADMIN"
```

## 🎯 Usage

### Starting the Application

```bash
python app.py
```

The application will be available at `http://localhost:5000`

### Customer Workflow

1. **Sign In** with Google account
2. **Fill Resume Form** using the multi-step wizard:
   - Step 1: Personal Information (with photo upload)
   - Step 2: Professional Summary
   - Step 3: Work Experience
   - Step 4: Education & Skills
   - Step 5: Projects & Template Selection
3. **Auto-Save** - Draft saves automatically as you type
4. **Submit Order** - Generates Ref ID and QR code
5. **Track Status** - View order status in Customer Dashboard
6. **Download PDF** - Once order is fulfilled by admin

### Admin Workflow

1. **Sign In** with admin account
2. **Access Admin Panel** - Click "Admin Panel" tab
3. **Filter Orders** - Use date filter or search by Ref ID
4. **Edit Resumes** - Click "Edit" to modify customer data
5. **Fulfill Orders** - Click "Fulfill" to generate PDF
6. **Download PDFs** - Access generated PDFs directly

## 📊 Database Schema

### Users Collection
```javascript
users/{uid}
{
  "email": "customer@gmail.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "role": "CUSTOMER", // or "ADMIN"
  "dailyEdits": {
    "date": "2026-08-16",
    "count": 2
  }
}
```

### Orders Collection
```javascript
orders/{orderId}
{
  "refId": "REF-20260816-1234",
  "customerId": "uid_12345",
  "customerEmail": "customer@gmail.com",
  "customerName": "John Doe",
  "status": "PENDING", // "PENDING" | "FULFILLED" | "CANCELLED"
  "templateType": "canva_modern_1",
  "resumeData": {
    "personalInfo": { ... },
    "summary": "...",
    "experience": [...],
    "education": [...],
    "projects": [...],
    "skills": [...]
  },
  "createdAt": "2026-08-16T10:54:50Z",
  "fulfilledAt": null,
  "pdfStorageUrl": null
}
```

### Drafts Collection
```javascript
users/{uid}/drafts/active
{
  "data": { ... }, // Current form data
  "updatedAt": "2026-08-16T10:54:50Z"
}
```

## 🎨 Template Options

1. **ATS Classic** - Clean, single-column format optimized for ATS systems
2. **Modern Design 1** - Two-column layout with photo sidebar
3. **Creative Design 2** - Accent header banner with sleek typography
4. **Minimalist Design 3** - Clean borders with pastel accents
5. **Executive Design 4** - Formal dark header for professional roles

## 🔧 API Endpoints

### Authentication
- `GET /api/user-role` - Get current user's role

### Draft Management
- `POST /api/save-draft` - Auto-save form draft
- `GET /api/load-draft` - Load saved draft

### Order Management
- `POST /api/create-order` - Create new resume order
- `GET /api/orders` - Get orders (admin only, supports date/refId filters)
- `PUT /api/update-resume` - Update resume data (enforces edit limits)
- `POST /api/fulfill-order` - Fulfill order and generate PDF (admin only)
- `GET /api/download-resume/<ref_id>` - Download generated PDF

### File Upload
- `POST /api/upload-photo` - Upload profile photo

## 🔒 Security Features

- Firebase Authentication with Google Sign-In
- Role-based access control (Customer/Admin)
- Daily edit limit enforcement (5 edits/day for customers)
- Admin-only endpoints protected
- Secure token verification for all API calls

## 🧪 Testing

### Test Customer Workflow

1. Sign in with a regular Google account
2. Fill out the resume form partially
3. Refresh the page - data should be restored (auto-save)
4. Complete the form and submit order
5. Note the Ref ID and QR code
6. Check Customer Dashboard for order status

### Test Admin Workflow

1. Sign in with admin account
2. Go to Admin Panel
3. Search for the test order by Ref ID
4. Edit customer data
5. Click "Fulfill" to generate PDF
6. Verify PDF is generated and downloadable

### Test Edit Limits

1. As a customer, try to edit resume more than 5 times
2. Verify warning appears on 6th attempt
3. As admin, verify unlimited edit access

## 🐛 Troubleshooting

### Firebase Initialization Errors
- Verify all environment variables are set correctly
- Ensure service account key is valid and not expired
- Check that Firestore database is created in correct region

### Authentication Issues
- Ensure Google Sign-In is enabled in Firebase Console
- Verify authorized domains in Firebase Authentication settings
- Check that Firebase Web SDK config matches your project

### PDF Generation Issues
- Verify ReportLab and Pillow are installed correctly
- Check that uploads directory has write permissions
- Ensure image URLs are accessible for photo embedding

### Auto-save Not Working
- Check browser console for Firebase errors
- Verify Firestore database rules allow read/write
- Ensure user is properly authenticated

## 📝 Development Notes

- The application uses Flask for the backend with Firebase Admin SDK
- Frontend uses vanilla JavaScript with Firebase Web SDK
- PDF generation uses ReportLab with Pillow for image processing
- QR code generation uses qrcode.js library
- Tailwind CSS is used for styling via CDN

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Set all Firebase credentials in production environment
2. **Secret Key**: Use a strong, random `FLASK_SECRET_KEY`
3. **Database Rules**: Configure Firestore security rules for production
4. **HTTPS**: Enable HTTPS for production deployment
5. **File Storage**: Consider using Firebase Storage for uploaded photos and PDFs
6. **Scaling**: Consider using a production WSGI server like Gunicorn

### Firebase Security Rules Example

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN');
      
      // Drafts subcollection
      match /drafts/{draftId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Orders collection
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        (resource.data.customerId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN');
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.customerId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN');
    }
  }
}
```

## 📄 License

This project is provided as-is for educational and commercial use.

## 🤝 Support

For issues and questions, please refer to the troubleshooting section or check Firebase documentation for specific configuration issues.
