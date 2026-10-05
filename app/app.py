import os
import socket
import hashlib
import uuid
import json
import urllib.request
import urllib.parse
from builtins import Exception, ValueError, print
from flask import Flask, render_template, request, jsonify, session, send_from_directory, redirect
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
import functools

app = Flask(__name__)
# In production, use a strong random secret key.
app.secret_key = os.environ.get('SECRET_KEY', 'ghost_super_secret_key')

# Supabase Cloud Vault Gateway Configuration (Cross-network synchronization)
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://wvhvjovmshgacgqjgtjy.supabase.co').rstrip('/')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2aHZqb3Ztc2hnYWNncWpndGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMTgwOTEsImV4cCI6MjA1Njc5NDA5MX0.Z0')
VAULT_MODE = os.environ.get('VAULT_MODE', 'CLOUD')

# Database Configuration: default to local SQLite for native dev, or use DATABASE_URL (e.g. Postgres in Docker)
default_db_path = os.path.abspath(os.path.join(app.root_path, 'shuttler.db'))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', f'sqlite:///{default_db_path}')
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
    lan_ip = os.environ.get('LAN_IP', host_ip)
    is_auth = session.get('authenticated', False)
    return render_template(
        'index.html',
        host_ip=host_ip,
        lan_ip=lan_ip,
        is_auth=is_auth,
        vault_mode=VAULT_MODE,
        supabase_url=SUPABASE_URL
    )

@app.route('/auth', methods=['POST'])
def authenticate():
    data = request.get_json()
    if not data or 'pin' not in data or not data['pin'].strip():
        return jsonify({'error': '4-Digit Ghost Key is required'}), 400
    
    user_pin = data['pin'].strip()
    if len(user_pin) != 4 or not user_pin.isdigit():
        return jsonify({'error': 'PIN must be exactly 4 digits (e.g. 1024)'}), 400
    
    # Hash 4-digit PIN for tenant isolation across devices
    vault_hash = hashlib.sha256(user_pin.encode()).hexdigest()
    
    session.permanent = True
    session['authenticated'] = True
    session['raw_pin'] = user_pin
    session['vault_id'] = vault_hash
    return jsonify({
        'message': f'Access Granted to secure vault #{user_pin}',
        'vault_id': user_pin,
        'mode': VAULT_MODE
    })

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('authenticated', None)
    session.pop('vault_id', None)
    session.pop('raw_pin', None)
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
        raw_pin = session.get('raw_pin', '0000')
        vault_id = session.get('vault_id')
        filename = secure_filename(file.filename)
        unique_id = uuid.uuid4().hex[:12]
        safe_filename = f"{unique_id}_{filename}"
        filepath = os.path.join(VAULT_DIR, safe_filename)
        
        try:
            file.save(filepath)
            metadata = FileMetadata(vault_id=vault_id, filename=filename, filepath=filepath)
            db.session.add(metadata)
            db.session.commit()

            # Cross-Network Supabase Cloud Vault Sync
            if VAULT_MODE == 'CLOUD' and SUPABASE_URL:
                try:
                    storage_path = f"{raw_pin}/{safe_filename}"
                    storage_url = f"{SUPABASE_URL}/storage/v1/object/vault_files/{storage_path}"
                    with open(filepath, 'rb') as f_read:
                        file_bytes = f_read.read()

                    upload_req = urllib.request.Request(
                        storage_url,
                        data=file_bytes,
                        headers={
                            "apikey": SUPABASE_ANON_KEY,
                            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                            "Content-Type": file.content_type or "application/octet-stream",
                            "x-upsert": "true"
                        },
                        method="POST"
                    )
                    with urllib.request.urlopen(upload_req, timeout=30) as upload_resp:
                        pass

                    public_url = f"{SUPABASE_URL}/storage/v1/object/public/vault_files/{storage_path}"
                    rest_url = f"{SUPABASE_URL}/rest/v1/vault_shuttle"
                    rest_payload = json.dumps({
                        "vault_pin": raw_pin,
                        "filename": filename,
                        "file_url": public_url,
                        "file_size": len(file_bytes),
                        "mime_type": file.content_type or "application/octet-stream",
                        "storage_path": storage_path
                    }).encode('utf-8')

                    meta_req = urllib.request.Request(
                        rest_url,
                        data=rest_payload,
                        headers={
                            "apikey": SUPABASE_ANON_KEY,
                            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                            "Content-Type": "application/json",
                            "Prefer": "return=minimal"
                        },
                        method="POST"
                    )
                    with urllib.request.urlopen(meta_req, timeout=15) as meta_resp:
                        pass
                except Exception as cloud_err:
                    print(f"Supabase Cloud Sync notification: {cloud_err}")

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
    raw_pin = session.get('raw_pin')
    vault_id = session.get('vault_id')

    # In CLOUD mode, query Supabase Cloud Vault PostgREST for cross-network files
    if VAULT_MODE == 'CLOUD' and raw_pin and SUPABASE_URL:
        try:
            req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/vault_shuttle?vault_pin=eq.{raw_pin}&order=created_at.desc",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                cloud_files = json.loads(resp.read().decode('utf-8'))
                formatted = [
                    {
                        'id': str(f.get('id')),
                        'filename': f.get('filename'),
                        'uploaded_at': f.get('created_at', ''),
                        'file_url': f.get('file_url'),
                        'file_size': f.get('file_size')
                    }
                    for f in cloud_files
                ]
                return jsonify(formatted)
        except Exception as e:
            print(f"Cloud vault query fallback: {e}")

    # Fallback to local SQLite database
    files = FileMetadata.query.filter_by(vault_id=vault_id).order_by(FileMetadata.uploaded_at.desc()).all()
    file_list = [{'id': str(f.id), 'filename': f.filename, 'uploaded_at': f.uploaded_at.isoformat()} for f in files]
    return jsonify(file_list)

@app.route('/download/<file_id>', methods=['GET'])
@login_required
def download_file(file_id):
    raw_pin = session.get('raw_pin')
    vault_id = session.get('vault_id')

    # Check local SQLite first
    if str(file_id).isdigit():
        file_meta = FileMetadata.query.filter_by(id=int(file_id), vault_id=vault_id).first()
        if file_meta and os.path.exists(file_meta.filepath):
            return send_from_directory(
                VAULT_DIR,
                os.path.basename(file_meta.filepath),
                as_attachment=True,
                download_name=file_meta.filename
            )

    # Check Supabase Cloud Vault
    if VAULT_MODE == 'CLOUD' and raw_pin and SUPABASE_URL:
        try:
            req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/vault_shuttle?id=eq.{file_id}",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                records = json.loads(resp.read().decode('utf-8'))
                if records:
                    rec = records[0]
                    file_url = rec.get('file_url')
                    if file_url:
                        return redirect(file_url)
        except Exception as e:
            print(f"Download resolution error: {e}")

    return jsonify({'error': 'File not found or unauthorized'}), 404

@app.route('/delete/<file_id>', methods=['POST', 'DELETE'])
@login_required
def delete_file(file_id):
    raw_pin = session.get('raw_pin')
    vault_id = session.get('vault_id')

    # Local SQLite deletion
    if str(file_id).isdigit():
        file_meta = FileMetadata.query.filter_by(id=int(file_id), vault_id=vault_id).first()
        if file_meta:
            try:
                if os.path.exists(file_meta.filepath):
                    os.remove(file_meta.filepath)
                db.session.delete(file_meta)
                db.session.commit()
            except Exception as e:
                db.session.rollback()

    # Supabase Cloud Vault deletion (storage object + database row)
    if VAULT_MODE == 'CLOUD' and raw_pin and SUPABASE_URL:
        try:
            req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/vault_shuttle?id=eq.{file_id}",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
                }
            )
            storage_path = None
            with urllib.request.urlopen(req, timeout=10) as resp:
                records = json.loads(resp.read().decode('utf-8'))
                if records:
                    storage_path = records[0].get('storage_path')

            # Delete from PostgREST
            del_req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/vault_shuttle?id=eq.{file_id}",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
                },
                method="DELETE"
            )
            with urllib.request.urlopen(del_req, timeout=10) as resp:
                pass

            # Delete from Supabase Storage
            if storage_path:
                stor_req = urllib.request.Request(
                    f"{SUPABASE_URL}/storage/v1/object/vault_files/{storage_path}",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
                    },
                    method="DELETE"
                )
                with urllib.request.urlopen(stor_req, timeout=10) as resp:
                    pass
        except Exception as e:
            print(f"Supabase delete warning: {e}")

    return jsonify({'message': 'File deleted successfully'})

@app.route('/robots.txt')
def static_from_root():
    return send_from_directory(app.static_folder, request.path[1:])

@app.route('/sitemap.xml')
def sitemap_from_root():
    return send_from_directory(app.static_folder, request.path[1:])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
