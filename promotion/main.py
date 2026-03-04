import time
import os
import config
import uploader_naver
import uploader_daum
import utils

# 디렉토리 설정
BASE_DIR = os.getcwd()
CONTENTS_DIR = os.path.join(BASE_DIR, 'contents')
UPLOADED_DIR = os.path.join(BASE_DIR, 'uploaded')

def job():
    print(f"\n[JOB START] {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. 이미지 찾기
    images = utils.get_images(CONTENTS_DIR)
    
    if not images:
        print("No new images found.")
        return

    print(f"Found {len(images)} images.")

    for image_path in images:
        print(f"Processing: {image_path}")
        
        success_naver = False
        success_daum = False
        
        # 2. 네이버 업로드
        if config.NAVER["ENABLE"]:
            try:
                success_naver = uploader_naver.upload_naver(image_path)
            except Exception as e:
                print(f"Failed to upload to Naver: {e}")
        else:
            success_naver = True # Skip이면 성공으로 간주? 
            # 아니면 아예 이동 안함? 
            # 일단 두 플랫폼 다 성공해야 이동하는 보수적인 로직 사용
            # 사용 안함 설정이면 True 처리
            success_naver = True

        # 3. 다음 업로드
        if config.DAUM["ENABLE"]:
            try:
                success_daum = uploader_daum.upload_daum(image_path)
            except Exception as e:
                print(f"Failed to upload to Daum: {e}")
        else:
            success_daum = True

        # 4. 결과 처리 및 파일 이동
        if success_naver and success_daum:
            utils.move_to_uploaded(image_path, UPLOADED_DIR)
            print(f"Success! Moved {image_path} to uploaded folder.")
        else:
            print(f"Failed to upload {image_path}. Will retry next time.")

def run():
    print("==========================================")
    print("      Cafe Auto Uploader")
    print("==========================================")
    print(f"Checking for images in: {CONTENTS_DIR}")
    
    # 한 번만 실행하고 종료
    job()
    
    print("==========================================")
    print("      Done!")
    print("==========================================")

if __name__ == "__main__":
    run()
