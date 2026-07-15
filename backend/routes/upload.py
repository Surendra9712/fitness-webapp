import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from middleware.auth import role_required

upload_bp = Blueprint('upload', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
CERT_EXTENSIONS    = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}
CHAT_DOC_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip'}
CHAT_EXTENSIONS     = ALLOWED_EXTENSIONS | CHAT_DOC_EXTENSIONS
MAX_FILE_SIZE      = 5 * 1024 * 1024   # 5 MB
CERT_MAX_SIZE      = 10 * 1024 * 1024  # 10 MB
CHAT_MAX_SIZE      = 15 * 1024 * 1024  # 15 MB


def _allowed(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _allowed_cert(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in CERT_EXTENSIONS


def _allowed_chat(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in CHAT_EXTENSIONS


@upload_bp.route('/image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image field in request'}), 400

    file = request.files['image']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not _allowed(file.filename):
        return jsonify({'error': 'Unsupported file type. Use PNG, JPG, JPEG, GIF or WEBP'}), 400

    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({'error': 'File too large. Maximum size is 5 MB'}), 413

    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = os.path.join(current_app.static_folder, 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    file.save(os.path.join(upload_dir, filename))

    return jsonify({'url': f"/static/uploads/{filename}", 'filename': filename}), 201


@upload_bp.route('/cert', methods=['POST'])
def upload_cert():
    if 'file' not in request.files:
        return jsonify({'error': 'No file field in request'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not _allowed_cert(file.filename):
        return jsonify({'error': 'Unsupported type. Use PNG, JPG, JPEG, WEBP or PDF'}), 400

    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > CERT_MAX_SIZE:
        return jsonify({'error': 'File too large. Maximum size is 10 MB'}), 413

    ext = file.filename.rsplit('.', 1)[1].lower()
    file_type = 'pdf' if ext == 'pdf' else 'image'
    filename = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = os.path.join(current_app.static_folder, 'uploads', 'certs')
    os.makedirs(upload_dir, exist_ok=True)
    file.save(os.path.join(upload_dir, filename))

    return jsonify({
        'url': f"/static/uploads/certs/{filename}",
        'filename': filename,
        'file_type': file_type,
    }), 201


@upload_bp.route('/chat-file', methods=['POST'])
@role_required('trainee', 'dietitian')
def upload_chat_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file field in request'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not _allowed_chat(file.filename):
        return jsonify({'error': 'Unsupported file type'}), 400

    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > CHAT_MAX_SIZE:
        return jsonify({'error': 'File too large. Maximum size is 15 MB'}), 413

    original_name = file.filename
    ext = original_name.rsplit('.', 1)[1].lower()
    file_type = 'image' if ext in ALLOWED_EXTENSIONS else 'file'
    filename = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = os.path.join(current_app.static_folder, 'uploads', 'chat')
    os.makedirs(upload_dir, exist_ok=True)
    file.save(os.path.join(upload_dir, filename))

    return jsonify({
        'url': f"/static/uploads/chat/{filename}",
        'filename': filename,
        'original_name': original_name,
        'file_type': file_type,
        'size': size,
    }), 201
