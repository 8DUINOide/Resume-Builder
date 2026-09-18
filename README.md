# Artex Resume Builder

A comprehensive, client-side, real-time auto-saving resume generation platform powered by Firebase (Auth & Firestore) and JS-based PDF generation (jsPDF & html2canvas).

## <i class="fa-solid fa-building"></i> Features

- **Google Sign-In Authentication** with role-based access (Customer/Admin)
- **Real-time Auto-Save** mechanism using Firestore
- **Multi-step Resume Builder** with structured forms
- **5 Professional Templates** (1 ATS + 4 Modern/Creative designs)
- **AI Resume Parsing** (Extract data from old resumes via Gemini API integration)
- **Photo Upload** with compression and client-side processing
- **Admin Dashboard** with filtering, inline editing, and order fulfillment
- **Blank Template Downloads** for admins to print fillable bio-data forms
- **High-Quality PDF Generation** strictly on the client-side (No backend required)

## <i class="fa-solid fa-clipboard-list"></i> Prerequisites

- A web server to host static files (e.g., VS Code Live Server, Firebase Hosting, GitHub Pages)
- Firebase account with Google Sign-In and Firestore enabled

## <i class="fa-solid fa-rocket"></i> Setup Instructions

### 1. Firebase Project Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Enable Google Sign-In in Authentication > Sign-in method

2. **Setup Firestore Database**
   - Go to Firestore Database and click "Create database"
   - Use test mode (or production mode with proper rules)
   - Select a location (e.g., us-central)

3. **Update Firebase Config**
   - Edit `static/js/app.js` and `static/js/admin.js`
   - Replace the `firebaseConfig` object with your actual Firebase project configuration from the Firebase Console (Project Settings > General > Your apps)

### 2. Set Up Admin User

To create an admin user, update the Firestore database manually:
1. Sign in with Google through the app first.
2. Go to Firebase Console > Firestore Database.
3. Find your user document in the `users` collection.
4. Add or update the `role` field to `"ADMIN"`.

### 3. Running the App

This is a purely static front-end application. No backend server (like Flask or Node) is required.

- Open `index.html` via **Live Server** in VS Code, or host it on any static web server.
- The application will be accessible via your localhost or domain.

## <i class="fa-solid fa-bullseye"></i> Usage

### Customer Workflow

1. **Sign In** with a Google account.
2. **Fill Resume Form** using the multi-step wizard:
   - Use **AI Scan** to auto-fill details from an existing resume image.
   - Step 1: Personal Information (with photo upload)
   - Step 2: Photo cropping/sizing
   - Step 3: Template selection & Color Themes
   - Step 4: Preview and Generate Order
3. **Download PDF** - The resume will automatically generate and download as a high-quality PDF.
4. **Order Reference** - Redirected to a success page with a Reference ID.

### Admin Workflow

1. **Sign In** with an admin account and open `admin.html`.
2. **Filter Orders** - View pending and fulfilled orders.
3. **Edit Resumes** - Click "Edit" to modify customer data directly in a modal overlay.
4. **Fulfill & Download** - Click "Download PDF" to fulfill the order and generate the printable file.
5. **Download Blank Templates** - Click "Download Template" to print empty, fill-in-the-blank bio-data forms based on the professional designs.

## <i class="fa-solid fa-palette"></i> Template Options

1. **ATS Classic** - Clean, single-column format optimized for ATS systems.
2. **Modern Design** - Two-column layout with a photo sidebar.
3. **Creative Banner** - Accent header banner with sleek typography.
4. **Minimal Elegant** - Clean borders with pastel accents.
5. **Executive Dark** - Formal dark header for professional roles.

## <i class="fa-solid fa-wrench"></i> Technical Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend/DB**: Firebase Authentication, Cloud Firestore
- **PDF Generation**: jsPDF, html2canvas (client-side)
- **AI Parsing**: Google Gemini Vision API (or placeholder endpoint depending on implementation)

## <i class="fa-solid fa-file-lines"></i> License

This project is provided as-is for educational and commercial use.
