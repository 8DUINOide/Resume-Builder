import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _normalize_private_key(value):
    if not value:
        return value
    return value.replace('\\n', '\n').replace('\\r', '\r')


class Config:
    """Application configuration"""

    BASE_DIR = Path(__file__).resolve().parent

    # Flask
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    ENV = os.getenv('FLASK_ENV', 'development')

    # Firebase Admin SDK
    FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID')
    FIREBASE_PRIVATE_KEY_ID = os.getenv('FIREBASE_PRIVATE_KEY_ID')
    FIREBASE_PRIVATE_KEY = _normalize_private_key(os.getenv('FIREBASE_PRIVATE_KEY'))
    FIREBASE_CLIENT_EMAIL = os.getenv('FIREBASE_CLIENT_EMAIL')
    FIREBASE_CLIENT_ID = os.getenv('FIREBASE_CLIENT_ID')
    FIREBASE_AUTH_URI = os.getenv('FIREBASE_AUTH_URI')
    FIREBASE_TOKEN_URI = os.getenv('FIREBASE_TOKEN_URI')
    FIREBASE_AUTH_PROVIDER_X509_CERT_URL = os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL')
    FIREBASE_CLIENT_X509_CERT_URL = os.getenv('FIREBASE_CLIENT_X509_CERT_URL')

    # Firebase Web SDK (for frontend)
    FIREBASE_API_KEY = os.getenv('FIREBASE_API_KEY', '')
    FIREBASE_AUTH_DOMAIN = os.getenv('FIREBASE_AUTH_DOMAIN', '')
    FIREBASE_DATABASE_URL = os.getenv('FIREBASE_DATABASE_URL', '')
    FIREBASE_STORAGE_BUCKET = os.getenv('FIREBASE_STORAGE_BUCKET', '')
    FIREBASE_MESSAGING_SENDER_ID = os.getenv('FIREBASE_MESSAGING_SENDER_ID', '')
    FIREBASE_APP_ID = os.getenv('FIREBASE_APP_ID', '')

    # Application Settings
    MAX_DAILY_EDITS = 5
    PDF_OUTPUT_DIR = 'generated_pdfs'
    UPLOAD_FOLDER = 'uploads'

    @classmethod
    def get_firebase_web_config(cls):
        config = {
            'apiKey': cls.FIREBASE_API_KEY,
            'authDomain': cls.FIREBASE_AUTH_DOMAIN,
            'databaseURL': cls.FIREBASE_DATABASE_URL,
            'projectId': cls.FIREBASE_PROJECT_ID,
            'storageBucket': cls.FIREBASE_STORAGE_BUCKET,
            'messagingSenderId': cls.FIREBASE_MESSAGING_SENDER_ID,
            'appId': cls.FIREBASE_APP_ID,
        }

        return {key: value for key, value in config.items() if value not in (None, '')}

    @classmethod
    def has_valid_firebase_web_config(cls):
        config = cls.get_firebase_web_config()
        return bool(config.get('apiKey') and config.get('projectId'))
