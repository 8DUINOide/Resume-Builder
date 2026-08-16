from flask import Flask, render_template, send_from_directory, jsonify
from flask_cors import CORS

from config import Config

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Import API routes
from api import routes

# Register API blueprint
app.register_blueprint(routes.api_bp, url_prefix='/api')


@app.route('/')
def index():
    return render_template('index.html', firebase_config=Config.get_firebase_web_config())


@app.route('/api/firebase-config')
def firebase_config():
    return jsonify(Config.get_firebase_web_config())


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)


@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory('uploads', filename)


@app.route('/generated_pdfs/<path:filename>')
def serve_pdfs(filename):
    return send_from_directory('generated_pdfs', filename)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
