import os
import socket
import hashlib
import uuid
import io
import zipfile
import mimetypes
from builtins import Exception, ValueError, print
from flask import Flask, render_template, request, jsonify, session, send_from_directory, send_file
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
import functools

app = Flask(__name__)
# In production, use a strong random secret key.
app.secret_key = os.environ.get('SECRET_KEY', 'ghost_super_secret_key')

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
    file_size = db.Column(db.BigInteger, default=0)
    mime_type = db.Column(db.String(128), default='application/octet-stream')
    uploaded_at = db.Column(db.DateTime, server_default=db.func.now())

with app.app_context():
    try:
        db.create_all()
        # Verify schema by testing read
        FileMetadata.query.first()
    except Exception as e:
        print(f"Schema update needed: {e}")
        try:
            with db.engine.connect() as conn:
                try:
                    conn.execute(db.text("ALTER TABLE file_metadata ADD COLUMN file_size BIGINT DEFAULT 0"))
                except Exception:
                    pass
                try:
                    conn.execute(db.text("ALTER TABLE file_metadata ADD COLUMN mime_type VARCHAR(128) DEFAULT 'application/octet-stream'"))
                except Exception:
                    pass
                conn.commit()
        except Exception:
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
    return render_template('index.html', host_ip=host_ip, lan_ip=lan_ip, is_auth=is_auth)

@app.route('/auth', methods=['POST'])
def authenticate():
    data = request.get_json()
    if not data or 'pin' not in data or not data['pin'].strip():
        return jsonify({'error': 'Ghost Key (PIN) is required'}), 400
    
    user_pin = data['pin'].strip()
    vault_hash = hashlib.sha256(user_pin.encode()).hexdigest()
    
    session['authenticated'] = True
    session['vault_id'] = vault_hash
    return jsonify({'message': 'Access Granted to secure vault', 'vault_id': vault_hash[:8]})

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('authenticated', None)
    session.pop('vault_id', None)
    return jsonify({'message': 'Logged out'})

@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    vault_id = session.get('vault_id')
    files = request.files.getlist('files')
    if not files or len(files) == 0 or (len(files) == 1 and files[0].filename == ''):
        files = request.files.getlist('file')
    
    if not files or len(files) == 0 or (len(files) == 1 and files[0].filename == ''):
        return jsonify({'error': 'No file selected for upload'}), 400

    saved_files = []
    
    for file in files:
        if not file or file.filename == '':
            continue
        filename = secure_filename(file.filename) or f"shuttle_file_{uuid.uuid4().hex[:6]}"
        unique_id = uuid.uuid4().hex[:12]
        safe_filename = f"{unique_id}_{filename}"
        filepath = os.path.join(VAULT_DIR, safe_filename)

        try:
            file.save(filepath)
            file_size = os.path.getsize(filepath) if os.path.exists(filepath) else 0
            mime_type, _ = mimetypes.guess_type(filename)
            mime_type = mime_type or file.content_type or 'application/octet-stream'

            metadata = FileMetadata(
                vault_id=vault_id,
                filename=filename,
                filepath=filepath,
                file_size=file_size,
                mime_type=mime_type
            )
            db.session.add(metadata)
            db.session.commit()
            saved_files.append({
                'id': metadata.id,
                'filename': filename,
                'file_size': file_size,
                'mime_type': mime_type
            })
        except Exception as e:
            db.session.rollback()
            if os.path.exists(filepath):
                os.remove(filepath)
            print(f"Upload error: {e}")
            return jsonify({'error': f'Upload failed: {str(e)}'}), 500

    return jsonify({
        'message': f'Successfully shuttled {len(saved_files)} file(s)',
        'uploaded': saved_files
    })

@app.route('/files', methods=['GET'])
@login_required
def list_files():
    vault_id = session.get('vault_id')
    files = FileMetadata.query.filter_by(vault_id=vault_id).order_by(FileMetadata.uploaded_at.desc()).all()
    
    audio_extensions = {'.wav', '.mp3', '.ogg', '.flac', '.aac', '.m4a', '.aiff'}
    
    file_list = []
    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        is_audio = ext in audio_extensions or (f.mime_type and f.mime_type.startswith('audio/'))
        file_list.append({
            'id': f.id,
            'filename': f.filename,
            'file_size': f.file_size or (os.path.getsize(f.filepath) if os.path.exists(f.filepath) else 0),
            'mime_type': f.mime_type or 'application/octet-stream',
            'is_audio': bool(is_audio),
            'uploaded_at': f.uploaded_at.isoformat() if f.uploaded_at else ''
        })
    return jsonify(file_list)

@app.route('/download/<int:file_id>', methods=['GET'])
@login_required
def download_file(file_id):
    vault_id = session.get('vault_id')
    file_meta = FileMetadata.query.filter_by(id=file_id, vault_id=vault_id).first()
    if not file_meta or not os.path.exists(file_meta.filepath):
        return jsonify({'error': 'File not found or unauthorized'}), 404
    
    return send_from_directory(
        VAULT_DIR,
        os.path.basename(file_meta.filepath),
        as_attachment=True,
        download_name=file_meta.filename,
        mimetype=file_meta.mime_type or 'application/octet-stream'
    )

@app.route('/stream/<int:file_id>', methods=['GET'])
@login_required
def stream_file(file_id):
    vault_id = session.get('vault_id')
    file_meta = FileMetadata.query.filter_by(id=file_id, vault_id=vault_id).first()
    if not file_meta or not os.path.exists(file_meta.filepath):
        return jsonify({'error': 'Audio file not found or unauthorized'}), 404

    return send_from_directory(
        VAULT_DIR,
        os.path.basename(file_meta.filepath),
        as_attachment=False,
        mimetype=file_meta.mime_type or 'application/octet-stream'
    )

@app.route('/download-all', methods=['GET'])
@login_required
def download_all_zip():
    vault_id = session.get('vault_id')
    files = FileMetadata.query.filter_by(vault_id=vault_id).all()
    if not files:
        return jsonify({'error': 'Vault partition is empty. Nothing to archive.'}), 404

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        added_names = set()
        for f in files:
            if os.path.exists(f.filepath):
                # Ensure unique filename inside zip if duplicates exist
                arcname = f.filename
                counter = 1
                name_base, ext = os.path.splitext(f.filename)
                while arcname in added_names:
                    arcname = f"{name_base}_({counter}){ext}"
                    counter += 1
                added_names.add(arcname)
                zf.write(f.filepath, arcname=arcname)

    memory_file.seek(0)
    zip_filename = f"ghost_vault_stems_{vault_id[:8]}.zip"
    return send_file(
        memory_file,
        mimetype='application/zip',
        as_attachment=True,
        download_name=zip_filename
    )

@app.route('/vault-stats', methods=['GET'])
@login_required
def vault_stats():
    vault_id = session.get('vault_id')
    files = FileMetadata.query.filter_by(vault_id=vault_id).all()
    total_bytes = sum(f.file_size or (os.path.getsize(f.filepath) if os.path.exists(f.filepath) else 0) for f in files)
    host_ip = get_host_ip()
    lan_ip = os.environ.get('LAN_IP', host_ip)
    
    return jsonify({
        'total_files': len(files),
        'total_bytes': total_bytes,
        'quota_bytes': 10 * 1024 * 1024 * 1024, # 10 GB partition limit
        'host_ip': host_ip,
        'lan_ip': lan_ip
    })

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
        return jsonify({'message': 'File deleted successfully', 'id': file_id})
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
