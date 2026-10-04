import os
import socket
import hashlib
import uuid
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

class FileMetadata(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vault_id = db.Column(db.String(64), nullable=False) # Hashed PIN for tenant isolation
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(512), nullable=False)
    uploaded_at = db.Column(db.DateTime, server_default=db.func.now())

with app.app_context():
    try:
        db.create_all()
        # Verify schema hasn't changed by attempting a read
        FileMetadata.query.first()
    except Exception as e:
        print("Schema altered, recreating database tables...")
        db.drop_all()
        db.create_all()

def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated') or not session.get('vault_id'):
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
    lan_ip = os.environ.get('LAN_IP', host_ip)  # Default to internal if not set
    is_auth = session.get('authenticated', False)
    return render_template('index.html', host_ip=host_ip, lan_ip=lan_ip, is_auth=is_auth)

@app.route('/auth', methods=['POST'])
def authenticate():
    data = request.get_json()
    if not data or 'pin' not in data or not data['pin'].strip():
        return jsonify({'error': 'Ghost Key (PIN) is required'}), 400
    
    # Accept any PIN, but use its hash to separate user vaults
    user_pin = data['pin'].strip()
    vault_hash = hashlib.sha256(user_pin.encode()).hexdigest()
    
    session['authenticated'] = True
    session['vault_id'] = vault_hash
    return jsonify({'message': 'Access Granted to secure vault'})

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('authenticated', None)
    session.pop('vault_id', None)
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
        vault_id = session.get('vault_id')
        filename = secure_filename(file.filename)
        # Ensure unique filepath across different vaults saving the same filename
        unique_id = uuid.uuid4().hex[:12]
        safe_filename = f"{unique_id}_{filename}"
        filepath = os.path.join(VAULT_DIR, safe_filename)
        
        try:
            file.save(filepath)
            metadata = FileMetadata(vault_id=vault_id, filename=filename, filepath=filepath)
            db.session.add(metadata)
            db.session.commit()
            return jsonify({'message': 'File uploaded successfully', 'filename': filename})
        except Exception as e:
            db.session.rollback()
            if os.path.exists(filepath):
                os.remove(filepath)
            print(f"Upload error: {e}")
            return jsonify({'error': 'Upload failed due to a server error.'}), 500

@app.route('/files', methods=['GET'])
@login_required
def list_files():
    vault_id = session.get('vault_id')
    files = FileMetadata.query.filter_by(vault_id=vault_id).order_by(FileMetadata.uploaded_at.desc()).all()
    file_list = [{'id': f.id, 'filename': f.filename, 'uploaded_at': f.uploaded_at.isoformat()} for f in files]
    return jsonify(file_list)

@app.route('/download/<int:file_id>', methods=['GET'])
@login_required
def download_file(file_id):
    vault_id = session.get('vault_id')
    file_meta = FileMetadata.query.filter_by(id=file_id, vault_id=vault_id).first()
    if not file_meta:
        return jsonify({'error': 'File not found or unauthorized'}), 404
    
    return send_from_directory(VAULT_DIR, os.path.basename(file_meta.filepath), as_attachment=True, download_name=file_meta.filename)

@app.route('/delete/<int:file_id>', methods=['POST', 'DELETE'])
@login_required
def delete_file(file_id):
    vault_id = session.get('vault_id')
    file_meta = FileMetadata.query.filter_by(id=file_id, vault_id=vault_id).first()
    if not file_meta:
        return jsonify({'error': 'File not found or unauthorized'}), 404
    
    try:
        if os.path.exists(file_meta.filepath):
            os.remove(file_meta.filepath)
        
        db.session.delete(file_meta)
        db.session.commit()
        return jsonify({'message': 'File deleted successfully'})
    except Exception as e:
        db.session.rollback()
        print(f"Delete error: {e}")
        return jsonify({'error': f'Failed to delete file: {str(e)}'}), 500

@app.route('/robots.txt')
def static_from_root():
    return send_from_directory(app.static_folder, request.path[1:])

@app.route('/sitemap.xml')
def sitemap_from_root():
    return send_from_directory(app.static_folder, request.path[1:])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
