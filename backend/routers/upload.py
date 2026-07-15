import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import JSONResponse

from dependencies import CurrentUser, require_roles

router = APIRouter()

STATIC_DIR = Path(__file__).resolve().parent.parent / 'static'

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


@router.post('/image')
async def upload_image(image: UploadFile | None = File(None, alias='image')):
    if image is None or not image.filename:
        return JSONResponse({'error': 'No image field in request'}, status_code=400)

    if not _allowed(image.filename):
        return JSONResponse({'error': 'Unsupported file type. Use PNG, JPG, JPEG, GIF or WEBP'}, status_code=400)

    content = await image.read()
    size = len(content)
    if size > MAX_FILE_SIZE:
        return JSONResponse({'error': 'File too large. Maximum size is 5 MB'}, status_code=413)

    ext = image.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = STATIC_DIR / 'uploads'
    upload_dir.mkdir(parents=True, exist_ok=True)
    (upload_dir / filename).write_bytes(content)

    return JSONResponse({'url': f"/static/uploads/{filename}", 'filename': filename}, status_code=201)


@router.post('/cert')
async def upload_cert(file: UploadFile | None = File(None)):
    if file is None or not file.filename:
        return JSONResponse({'error': 'No file field in request'}, status_code=400)

    if not _allowed_cert(file.filename):
        return JSONResponse({'error': 'Unsupported type. Use PNG, JPG, JPEG, WEBP or PDF'}, status_code=400)

    content = await file.read()
    size = len(content)
    if size > CERT_MAX_SIZE:
        return JSONResponse({'error': 'File too large. Maximum size is 10 MB'}, status_code=413)

    ext = file.filename.rsplit('.', 1)[1].lower()
    file_type = 'pdf' if ext == 'pdf' else 'image'
    filename = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = STATIC_DIR / 'uploads' / 'certs'
    upload_dir.mkdir(parents=True, exist_ok=True)
    (upload_dir / filename).write_bytes(content)

    return JSONResponse({
        'url': f"/static/uploads/certs/{filename}",
        'filename': filename,
        'file_type': file_type,
    }, status_code=201)


@router.post('/chat-file')
async def upload_chat_file(
    file: UploadFile | None = File(None),
    user: CurrentUser = Depends(require_roles('trainee', 'dietitian')),
):
    if file is None or not file.filename:
        return JSONResponse({'error': 'No file field in request'}, status_code=400)

    if not _allowed_chat(file.filename):
        return JSONResponse({'error': 'Unsupported file type'}, status_code=400)

    content = await file.read()
    size = len(content)
    if size > CHAT_MAX_SIZE:
        return JSONResponse({'error': 'File too large. Maximum size is 15 MB'}, status_code=413)

    original_name = file.filename
    ext = original_name.rsplit('.', 1)[1].lower()
    file_type = 'image' if ext in ALLOWED_EXTENSIONS else 'file'
    filename = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = STATIC_DIR / 'uploads' / 'chat'
    upload_dir.mkdir(parents=True, exist_ok=True)
    (upload_dir / filename).write_bytes(content)

    return JSONResponse({
        'url': f"/static/uploads/chat/{filename}",
        'filename': filename,
        'original_name': original_name,
        'file_type': file_type,
        'size': size,
    }, status_code=201)
