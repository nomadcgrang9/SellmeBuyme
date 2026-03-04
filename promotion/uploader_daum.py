from playwright.sync_api import sync_playwright
import time
import os
import config

def upload_daum(image_path):
    """
    다음 카페에 이미지를 업로드합니다.
    """
    if not config.DAUM["ENABLE"]:
        return False

    print(f"[DAUM] Uploading {os.path.basename(image_path)}...")
    
    user_data_dir = os.path.join(os.getcwd(), 'user_data')
    
    with sync_playwright() as p:
        try:
            context = p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=False,
                channel="chrome",
                args=["--disable-blink-features=AutomationControlled"]
            )
            
            page = context.pages[0] if context.pages else context.new_page()
            
            # 1. 글쓰기 화면으로 이동
            # 다음 카페는 grpid, fldid 등을 조합한 URL 사용
            # 예: https://cafe.daum.net/{CAFE_NAME}/_c21_/write?grpid={GRPID}&mgrpid=&fldid={FLDID}
            # config.py가 업데이트 되어야 정확히 작동하겠지만, 일단 일반적인 포맷 사용
            
            # 카페 메인으로 먼저 이동해서 로그인 여부 체크
            # 혹은 바로 글쓰기 URL 접근
            # 주소 규칙이 복잡하므로, config에 전체 URL을 넣는게 나을 수도 있으나 조합 시도.
            write_url = f"https://cafe.daum.net/{config.DAUM['CAFE_NAME']}/_c21_/write?grpid={config.DAUM['GRPID']}&fldid={config.DAUM['FLDID']}"
            
            page.goto(write_url)
            page.wait_for_load_state("networkidle")

            # 다음 카페는 'keditor_frame' 이라는 iframe을 사용할 수 있음.
            
            # 2. 제목 입력
            # #title
            page.wait_for_selector("input#title, input[name='title']", timeout=10000)
            page.fill("input[name='title']", config.POST_TITLE)

            # 3. 이미지 업로드
            # 다음 에디터 툴바 '사진' 버튼
            # 버튼 아이콘: .btn_photo or .btn_comm.btn_image
            
            try:
                with page.expect_file_chooser() as fc_info:
                    # '사진' 텍스트 혹은 버튼 클릭
                    # 에디터 툴바 내부에 있을 수 있음.
                    # iframe 내부인지 확인 필요. 보통 다음 카페는 메인 프레임에 툴바가 있음.
                    
                    photo_btn = page.locator(".btn_photo, .btn_image, button[title='사진']").first
                    if photo_btn.is_visible():
                        photo_btn.click()
                    else:
                        # 텍스트로 찾기
                        page.get_by_text("사진").first.click()
                
                file_chooser = fc_info.value
                file_chooser.set_files(image_path)
            
            except Exception as e:
                print(f"[DAUM] 파일 선택기 에러: {e}")
                # hidden input 직접 제어 시도
                try:
                    page.set_input_files('input[type="file"]', image_path)
                except:
                    pass

            time.sleep(5) # 업로드 대기

            # 4. 등록
            # '등록' 버튼, #btn_save 등
            submit_btn = page.get_by_text("등록", exact=True)
            # 보통 하단에 '등록' 버튼이 있음.
            # .btn_register, .btn_write 등
            
            if submit_btn.count() > 0:
                submit_btn.first.click()
            else:
                # 다른 셀렉터 시도
                page.click(".btn_register, #btn_save")

            time.sleep(3)
            
            print(f"[DAUM] Upload complete for {image_path}")
            context.close()
            return True

        except Exception as e:
            print(f"[DAUM] Error: {e}")
            try:
                page.screenshot(path=f"error_daum_{int(time.time())}.png")
            except:
                pass
            context.close()
            return False

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        upload_daum(sys.argv[1])
    else:
        print("Usage: python uploader_daum.py [image_path]")
