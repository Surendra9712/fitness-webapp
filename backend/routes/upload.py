import os
import uuid
from flask import Blueprint, request, jsonify, current_app

upload_bp = Blueprint('upload', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
CERT_EXTENSIONS    = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}
MAX_FILE_SIZE      = 5 * 1024 * 1024   # 5 MB
CERT_MAX_SIZE      = 10 * 1024 * 1024  # 10 MB


def _allowed(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _allowed_cert(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in CERT_EXTENSIONS


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
