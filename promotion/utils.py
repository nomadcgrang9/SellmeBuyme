import os
import shutil
import glob
from config import IMAGE_EXTENSIONS

def get_images(directory):
    """
    지정된 디렉토리에서 이미지 파일 리스트를 가져옵니다.
    """
    images = []
    if not os.path.exists(directory):
        print(f"Directory not found: {directory}")
        return images

    for ext in IMAGE_EXTENSIONS:
        # 대소문자 구분 없이 확장자 매칭을 위해 간단히 구현
        images.extend(glob.glob(os.path.join(directory, f"*{ext}")))
        images.extend(glob.glob(os.path.join(directory, f"*{ext.upper()}")))
    
    # 중복 제거 및 정렬
    return sorted(list(set(images)))

def move_to_uploaded(file_path, uploaded_dir):
    """
    파일을 'uploaded' 디렉토리로 이동합니다.
    파일명이 중복될 경우 타임스탬프를 붙여서 이동합니다.
    """
    if not os.path.exists(uploaded_dir):
        os.makedirs(uploaded_dir)

    filename = os.path.basename(file_path)
    destination = os.path.join(uploaded_dir, filename)

    # 중복 파일명 처리
    if os.path.exists(destination):
        base, ext = os.path.splitext(filename)
        import time
        new_filename = f"{base}_{int(time.time())}{ext}"
        destination = os.path.join(uploaded_dir, new_filename)

    try:
        shutil.move(file_path, destination)
        print(f"Moved: {file_path} -> {destination}")
        return True
    except Exception as e:
        print(f"Error moving file {file_path}: {e}")
        return False
