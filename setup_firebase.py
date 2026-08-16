#!/usr/bin/env python3
"""
Firebase Setup Helper Script
This script helps users configure their Firebase credentials for the Resume Builder application.
"""

import os
import json
from pathlib import Path

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60 + "\n")

def print_step(step_num, text):
    """Print a formatted step"""
    print(f"\n{step_num}. {text}")

def get_user_input(prompt, default=None):
    """Get user input with optional default"""
    if default:
        prompt = f"{prompt} [{default}]: "
    else:
        prompt = f"{prompt}: "
    
    value = input(prompt).strip()
    return value if value else default

def setup_firebase():
    """Interactive Firebase setup"""
    print_header("Resume Builder - Firebase Setup Helper")
    
    print("This script will help you configure Firebase for the Resume Builder application.")
    print("Please have your Firebase project details ready.")
    print("\nYou can find these details in the Firebase Console:")
    print("https://console.firebase.google.com/\n")
    
    # Firebase Project Configuration
    print_step(1, "Firebase Project Configuration")
    
    project_id = get_user_input("Enter your Firebase Project ID")
    if not project_id:
        print("Error: Project ID is required")
        return False
    
    # Check if service account JSON file exists
    print_step(2, "Firebase Service Account Key")
    
    print("\nYou need to provide your Firebase service account key.")
    print("You can generate this from:")
    print("Firebase Console > Project Settings > Service Accounts > Generate New Private Key")
    print("\nOptions:")
    print("1. Provide path to existing service account JSON file")
    print("2. Enter credentials manually")
    
    choice = get_user_input("Choose option (1 or 2)", "1")
    
    service_account_data = {}
    
    if choice == "1":
        json_path = get_user_input("Enter path to service account JSON file")
        if not os.path.exists(json_path):
            print(f"Error: File not found: {json_path}")
            return False
        
        try:
            with open(json_path, 'r') as f:
                service_account_data = json.load(f)
            print("✓ Service account file loaded successfully")
        except Exception as e:
            print(f"Error loading JSON file: {e}")
            return False
    else:
        print("\nPlease enter your Firebase service account credentials:")
        service_account_data = {
            'type': 'service_account',
            'project_id': project_id,
            'private_key_id': get_user_input("Private Key ID"),
            'private_key': get_user_input("Private Key (include BEGIN/END markers)"),
            'client_email': get_user_input("Client Email"),
            'client_id': get_user_input("Client ID"),
            'auth_uri': get_user_input("Auth URI", "https://accounts.google.com/o/oauth2/auth"),
            'token_uri': get_user_input("Token URI", "https://oauth2.googleapis.com/token"),
            'auth_provider_x509_cert_url': get_user_input("Auth Provider Cert URL", "https://www.googleapis.com/oauth2/v1/certs"),
            'client_x509_cert_url': get_user_input("Client Cert URL")
        }
    
    # Firebase Web SDK Configuration
    print_step(3, "Firebase Web SDK Configuration (Frontend)")
    
    print("\nYou can find these in Firebase Console > Project Settings > General > Your Apps")
    
    api_key = get_user_input("API Key")
    auth_domain = get_user_input("Auth Domain", f"{project_id}.firebaseapp.com")
    database_url = get_user_input("Database URL", f"https://{project_id}.firebaseio.com")
    storage_bucket = get_user_input("Storage Bucket", f"{project_id}.appspot.com")
    messaging_sender_id = get_user_input("Messaging Sender ID")
    app_id = get_user_input("App ID")
    
    # Flask Configuration
    print_step(4, "Flask Configuration")
    
    import secrets
    secret_key = secrets.token_hex(32)
    flask_env = get_user_input("Flask Environment (development/production)", "development")
    
    # Generate .env file
    print_step(5, "Generate .env File")
    
    # Handle private key escaping outside f-string
    private_key_escaped = service_account_data.get('private_key', '').replace('\n', '\\n')
    
    env_content = f"""# Firebase Configuration
FIREBASE_PROJECT_ID={project_id}
FIREBASE_PRIVATE_KEY_ID={service_account_data.get('private_key_id', '')}
FIREBASE_PRIVATE_KEY="{private_key_escaped}"
FIREBASE_CLIENT_EMAIL={service_account_data.get('client_email', '')}
FIREBASE_CLIENT_ID={service_account_data.get('client_id', '')}
FIREBASE_AUTH_URI={service_account_data.get('auth_uri', 'https://accounts.google.com/o/oauth2/auth')}
FIREBASE_TOKEN_URI={service_account_data.get('token_uri', 'https://oauth2.googleapis.com/token')}
FIREBASE_AUTH_PROVIDER_X509_CERT_URL={service_account_data.get('auth_provider_x509_cert_url', 'https://www.googleapis.com/oauth2/v1/certs')}
FIREBASE_CLIENT_X509_CERT_URL={service_account_data.get('client_x509_cert_url', '')}

# Firebase Web SDK Configuration (for frontend)
FIREBASE_API_KEY={api_key}
FIREBASE_AUTH_DOMAIN={auth_domain}
FIREBASE_DATABASE_URL={database_url}
FIREBASE_STORAGE_BUCKET={storage_bucket}
FIREBASE_MESSAGING_SENDER_ID={messaging_sender_id}
FIREBASE_APP_ID={app_id}

# Flask Configuration
FLASK_SECRET_KEY={secret_key}
FLASK_ENV={flask_env}
"""
    
    env_path = Path('.env')
    if env_path.exists():
        overwrite = get_user_input(".env file already exists. Overwrite? (y/n)", "n")
        if overwrite.lower() != 'y':
            print("Setup cancelled. .env file not modified.")
            return False
    
    try:
        with open('.env', 'w') as f:
            f.write(env_content)
        print("✓ .env file created successfully")
    except Exception as e:
        print(f"Error creating .env file: {e}")
        return False
    
    # Update frontend Firebase config
    print_step(6, "Update Frontend Firebase Configuration")
    
    js_config = f"""// Firebase Configuration
const firebaseConfig = {{
    apiKey: "{api_key}",
    authDomain: "{auth_domain}",
    projectId: "{project_id}",
    storageBucket: "{storage_bucket}",
    messagingSenderId: "{messaging_sender_id}",
    appId: "{app_id}"
}};
"""
    
    js_path = Path('static/js/app.js')
    if js_path.exists():
        update_js = get_user_input("Update static/js/app.js with Firebase config? (y/n)", "y")
        if update_js.lower() == 'y':
            try:
                with open(js_path, 'r') as f:
                    js_content = f.read()
                
                # Replace the placeholder config
                import re
                pattern = r'const firebaseConfig = \{[^}]*\};'
                js_content = re.sub(pattern, js_config.strip(), js_content, flags=re.DOTALL)
                
                with open(js_path, 'w') as f:
                    f.write(js_content)
                print("✓ Frontend Firebase configuration updated")
            except Exception as e:
                print(f"Error updating app.js: {e}")
    
    # Final instructions
    print_header("Setup Complete!")
    
    print("\n✓ Firebase configuration completed successfully!")
    print("\nNext steps:")
    print("1. Install Python dependencies:")
    print("   pip install -r requirements.txt")
    print("\n2. Create required directories:")
    print("   mkdir -p uploads generated_pdfs")
    print("\n3. Start the application:")
    print("   python app.py")
    print("\n4. Access the application at: http://localhost:5000")
    print("\n5. Set up your first admin user:")
    print("   - Sign in with Google through the app")
    print("   - Go to Firebase Console > Firestore Database")
    print("   - Find your user in the 'users' collection")
    print("   - Update the 'role' field to 'ADMIN'")
    
    print("\n" + "=" * 60)
    print("  Important: Keep your .env file secure and never commit it!")
    print("=" * 60 + "\n")
    
    return True

if __name__ == "__main__":
    try:
        success = setup_firebase()
        if not success:
            print("\nSetup was not completed. Please try again.")
            exit(1)
    except KeyboardInterrupt:
        print("\n\nSetup cancelled by user.")
        exit(1)
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        exit(1)
