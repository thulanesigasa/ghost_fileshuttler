import os
import socket
from builtins import Exception, ValueError, print
from flask import Flask, render_template, request, jsonify, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
import functools

app = Flask(__name__)
# In production, use a strong random secret key.
app.secret_key = os.environ.get('SECRET_KEY', 'ghost_super_secret_key')

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://shuttler:ghostpass@db:5432/shuttlerdb')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

VAULT_DIR = os.path.abspath(os.path.join(app.root_path, 'shuttle_vault'))
os.makedirs(VAULT_DIR, exist_ok=True)

# Ghost Key Configuration (PIN)
GHOST_PIN = os.environ.get('GHOST_PIN', '1234')  # Hardcoded default for demo

class FileMetadata(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(512), nullable=False)
    uploaded_at = db.Column(db.DateTime, server_default=db.func.now())

with app.app_context():
    db.create_all()

def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return jsonify({'error': 'Unauthorized. Ghost Key required.'}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_host_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Doesn't need to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

@app.route('/')
def index():
    host_ip = get_host_ip()
    is_auth = session.get('authenticated', False)
    return render_template('index.html', host_ip=host_ip, is_auth=is_auth)

@app.route('/auth', methods=['POST'])
def authenticate():
    data = request.get_json()
    if not data or 'pin' not in data:
        return jsonify({'error': 'PIN is required'}), 400
    
    if data['pin'] == GHOST_PIN:
        session['authenticated'] = True
        return jsonify({'message': 'Access Granted'})
    else:
        return jsonify({'error': 'Invalid Ghost Key'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('authenticated', None)
    return jsonify({'message': 'Logged out'})

@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(VAULT_DIR, filename)
        
        try:
            # Atomic transaction using SQLAlchemy
            file.save(filepath)
            metadata = FileMetadata(filename=filename, filepath=filepath)
            db.session.add(metadata)
            db.session.commit()
            return jsonify({'message': 'File uploaded successfully', 'filename': filename})
        except Exception as e:
            db.session.rollback()
            # Clean up partial file if DB fails
            if os.path.exists(filepath):
                os.remove(filepath)
            print(f"Upload error: {e}")
            return jsonify({'error': 'Database transaction failed: File removed.'}), 500

@app.route('/files', methods=['GET'])
@login_required
def list_files():
    files = FileMetadata.query.order_by(FileMetadata.uploaded_at.desc()).all()
    file_list = [{'id': f.id, 'filename': f.filename, 'uploaded_at': f.uploaded_at.isoformat()} for f in files]
    return jsonify(file_list)

@app.route('/download/<int:file_id>', methods=['GET'])
@login_required
def download_file(file_id):
    file_meta = FileMetadata.query.get(file_id)
    if not file_meta:
        return jsonify({'error': 'File not found'}), 404
    
    return send_from_directory(VAULT_DIR, file_meta.filename, as_attachment=True)

@app.route('/robots.txt')
def static_from_root():
    return send_from_directory(app.static_folder, request.path[1:])

@app.route('/sitemap.xml')
def sitemap_from_root():
    return send_from_directory(app.static_folder, request.path[1:])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
