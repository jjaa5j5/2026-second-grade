import os
import shutil
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from PIL import Image
from PIL.ExifTags import TAGS

app = Flask(__name__)

# 정리된 사진들이 저장될 기본 폴더 경로
BASE_DIR = os.path.abspath("./organized_photos")
os.makedirs(BASE_DIR, exist_ok=True)

def get_exif_date(image_path):
    """이미지 파일에서 EXIF 촬영 날짜를 추출하는 함수"""
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()
        if not exif_data:
            return None
        for tag, value in exif_data.items():
            tag_name = TAGS.get(tag, tag)
            if tag_name in ['DateTimeOriginal', 'DateTime']:
                # 'YYYY:MM:DD HH:MM:SS' 형식에서 날짜 부분만 분리
                date_str = str(value).split(' ')[0]
                return datetime.strptime(date_str, '%Y:%m:%d')
    except Exception:
        return None
    return None

# 1. 메인 웹 페이지 렌더링
@app.route('/')
def index():
    return render_template('index.html')

# 2. 정리된 폴더 목록 조회 API
@app.route('/api/folders', methods=['GET'])
def get_folders():
    folders = []
    if os.path.exists(BASE_DIR):
        # 최신 순 정렬
        for item in sorted(os.listdir(BASE_DIR), reverse=True):
            item_path = os.path.join(BASE_DIR, item)
            if os.path.isdir(item_path):
                # 하위 폴더 내 이미지 파일 개수 집계
                file_count = 0
                for root, dirs, files in os.walk(item_path):
                    file_count += len([f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.tiff'))])
                folders.append({"name": item, "count": file_count})
    return jsonify(folders)

# 3. 특정 폴더의 사진 파일 목록 조회 API
@app.route('/api/photos/<path:folder_path>', methods=['GET'])
# [수정] 특정 폴더(상위 연-월 포함)의 모든 사진 파일 경로 조회 API
@app.route('/api/photos/<path:folder_path>', methods=['GET'])
def get_photos(folder_path):
    target_dir = os.path.join(BASE_DIR, folder_path)
    if not os.path.exists(target_dir):
        return jsonify([])
    
    supported_extensions = ('.jpg', '.jpeg', '.png', '.tiff')
    photo_list = []
    
    # 하위 폴더까지 탐색하여 상대 경로 목록 생성
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.lower().endswith(supported_extensions):
                # BASE_DIR 기준의 상대 경로 생성 (예: 2026-06/2026-06-15/photo.jpg)
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, BASE_DIR).replace('\\', '/')
                photo_list.append(rel_path)
                
    return jsonify(photo_list)
# 4. 이미지 파일 서빙 API (웹 브라우저에서 원본 사진 띄우기)
@app.route('/photos/<path:filepath>')
def serve_photo(filepath):
    return send_from_directory(BASE_DIR, filepath)

# 5. 드롭존 사진 업로드 및 EXIF 자동 분류 API
@app.route('/api/upload', methods=['POST'])
def upload_photos():
    if 'photos' not in request.files:
        return jsonify({"error": "파일이 없습니다."}), 400
        
    uploaded_files = request.files.getlist('photos')
    moved_count = 0

    for file in uploaded_files:
        if file.filename == '':
            continue
            
        # 임시 저장 후 EXIF 추출
        temp_path = os.path.join(BASE_DIR, file.filename)
        file.save(temp_path)
        
        date_taken = get_exif_date(temp_path)
        if date_taken:
            month_folder = date_taken.strftime('%Y-%m')
            day_folder = date_taken.strftime('%Y-%m-%d')
            target_dir = os.path.join(BASE_DIR, month_folder, day_folder)
        else:
            target_dir = os.path.join(BASE_DIR, 'unknown_Date')
            
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, file.filename)
        
        # 임시 저장된 파일을 분류 폴더로 이동
        shutil.move(temp_path, target_path)
        moved_count += 1

    return jsonify({"message": f"{moved_count}개 사진 정리 완료!"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
