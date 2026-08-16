import firebase_admin
from firebase_admin import credentials, firestore, auth
from config import Config
import os

def initialize_firebase():
    """Initialize Firebase Admin SDK when configuration is present."""
    try:
        required_fields = [
            Config.FIREBASE_PROJECT_ID,
            Config.FIREBASE_PRIVATE_KEY_ID,
            Config.FIREBASE_PRIVATE_KEY,
            Config.FIREBASE_CLIENT_EMAIL,
            Config.FIREBASE_CLIENT_ID,
            Config.FIREBASE_AUTH_URI,
            Config.FIREBASE_TOKEN_URI,
            Config.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
            Config.FIREBASE_CLIENT_X509_CERT_URL,
        ]

        if any(value in (None, '') for value in required_fields):
            print('Firebase Admin SDK not configured; skipping Firestore initialization.')
            return None

        if not firebase_admin._apps:
            firebase_config = {
                'type': 'service_account',
                'project_id': Config.FIREBASE_PROJECT_ID,
                'private_key_id': Config.FIREBASE_PRIVATE_KEY_ID,
                'private_key': Config.FIREBASE_PRIVATE_KEY,
                'client_email': Config.FIREBASE_CLIENT_EMAIL,
                'client_id': Config.FIREBASE_CLIENT_ID,
                'auth_uri': Config.FIREBASE_AUTH_URI,
                'token_uri': Config.FIREBASE_TOKEN_URI,
                'auth_provider_x509_cert_url': Config.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
                'client_x509_cert_url': Config.FIREBASE_CLIENT_X509_CERT_URL,
            }

            cred = credentials.Certificate(firebase_config)
            firebase_admin.initialize_app(cred)

        return firestore.client()
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        return None


# Initialize Firestore
db = initialize_firebase()
