from playwright.sync_api import sync_playwright
import time
import os
import config

print("[INFO] Smart Uploader v2 (New UI) Loaded")

def upload_naver(image_path):
    """
    네이버 카페 (신버전 UI: f-e)에 이미지를 업로드합니다.
    """
    if not config.NAVER["ENABLE"]:
        return False

    print(f"[NAVER] Uploading {os.path.basename(image_path)}...")
    user_data_dir = os.path.join(os.getcwd(), 'user_data')
    
    with sync_playwright() as p:
        try:
            context = p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=False,
                channel="chrome",
                viewport={"width": 1280, "height": 800},
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-site-isolation-trials",
                ]
            )
            
            # 자동화 감지 우회를 위한 추가 스크립트
            page = context.pages[0] if context.pages else context.new_page()
            page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """)
            
            # 1. 글쓰기 페이지로 직접 이동 (신버전 UI URL 형식)
            # https://cafe.naver.com/ca-fe/cafes/{CAFE_ID}/articles/write?boardType=L&menuId={MENU_ID}
            write_url = f"https://cafe.naver.com/ca-fe/cafes/{config.NAVER['CAFE_ID']}/articles/write?boardType=L&menuId={config.NAVER['MENU_ID']}"
            print(f"[NAVER] Going to Write Page: {write_url}")
            page.goto(write_url)
            page.wait_for_load_state("networkidle")
            time.sleep(3) # 에디터 완전 로딩 대기
            
            print(f"[NAVER] Current Page Title: {page.title()}")
            
            # 로그인 체크: 만약 로그인 페이지로 리다이렉트되었다면
            if "nidlogin" in page.url.lower() or "로그인" in page.title():
                print("[NAVER] ERROR: Not logged in! Please run manual_login.py first.")
                context.close()
                return False

            # 2. 게시판 선택 (필수!)
            print("[NAVER] Selecting board...")
            board_selected = False
            try:
                # "게시판을 선택해 주세요" 드롭다운 클릭
                board_dropdown = page.locator("text=게시판을 선택해 주세요").first
                if board_dropdown.is_visible():
                    board_dropdown.click()
                    time.sleep(1)
                    
                    # 드롭다운 메뉴에서 첫 번째 게시판 선택 (자유게시판 등)
                    # 클래스명이 변할 수 있으므로 여러 방법 시도
                    board_options = page.locator("[class*='SelectMenu'] li, [class*='option'], [class*='menu-item']")
                    if board_options.count() > 0:
                        board_options.first.click()
                        board_selected = True
                        print("[NAVER] Board selected from dropdown.")
                    time.sleep(1)
            except Exception as e:
                print(f"[NAVER] Board dropdown method 1 failed: {e}")
            
            if not board_selected:
                try:
                    # 방법 2: 직접 menuId에 해당하는 게시판 선택
                    page.locator(f"[data-menuid='{config.NAVER['MENU_ID']}'], li:has-text('자유게시판')").first.click()
                    board_selected = True
                    print("[NAVER] Board selected via alternative method.")
                    time.sleep(1)
                except Exception as e:
                    print(f"[NAVER] Board dropdown method 2 failed: {e}")
            
            if not board_selected:
                print("[NAVER] WARNING: Could not select board. Will try to continue anyway.")
                page.screenshot(path="debug_board_selection.png")

            # 3. 제목 입력 (신버전 UI: placeholder="제목")
            print("[NAVER] Setting title...")
            title_set = False
            try:
                # 방법 1: Placeholder로 찾기
                title_input = page.get_by_placeholder("제목")
                if title_input.is_visible():
                    title_input.fill(config.POST_TITLE)
                    title_set = True
                    print(f"[NAVER] Title set via placeholder: {config.POST_TITLE}")
            except Exception as e:
                print(f"[NAVER] Title placeholder method failed: {e}")
            
            if not title_set:
                try:
                    # 방법 2: Class로 찾기
                    title_input = page.locator("textarea.TitleInput__input--U1s65, textarea[class*='TitleInput']").first
                    if title_input.is_visible():
                        title_input.fill(config.POST_TITLE)
                        title_set = True
                        print(f"[NAVER] Title set via class selector")
                except Exception as e:
                    print(f"[NAVER] Title class method failed: {e}")
            
            if not title_set:
                print("[NAVER] FAILED to set title.")

            # 3. 이미지 업로드 (사진 버튼 클릭)
            print("[NAVER] Looking for Photo upload button...")
            file_input_handled = False
            
            try:
                # 방법 1: Role + Name으로 찾기 (가장 안정적)
                with page.expect_file_chooser(timeout=5000) as fc_info:
                    photo_btn = page.get_by_role("button", name="사진")
                    if photo_btn.is_visible():
                        photo_btn.click()
                    else:
                        # 방법 2: Class로 찾기
                        page.locator("button.se-image-toolbar-button").first.click()
                
                file_chooser = fc_info.value
                file_chooser.set_files(image_path)
                file_input_handled = True
                print("[NAVER] Image uploaded via file chooser.")
            except Exception as e:
                print(f"[NAVER] Photo button method failed: {e}")
            
            # 방법 B: 히든 파일 인풋에 직접 주입
            if not file_input_handled:
                print("[NAVER] Trying hidden file input injection...")
                try:
                    inputs = page.locator('input[type="file"]')
                    count = inputs.count()
                    print(f"[NAVER] Found {count} file inputs.")
                    if count > 0:
                        inputs.first.set_input_files(image_path)
                        file_input_handled = True
                        print("[NAVER] File injected into hidden input.")
                except Exception as e:
                    print(f"[NAVER] Hidden input injection failed: {e}")

            if not file_input_handled:
                print("[NAVER] CRITICAL: Could not upload image.")
                page.screenshot(path="error_naver_upload.png")
                context.close()
                return False

            time.sleep(5) # 이미지 업로드 완료 대기

            # 4. 등록 버튼 클릭
            print("[NAVER] Submitting...")
            submitted = False
            try:
                # 방법 1: Class로 찾기 (신버전)
                submit_btn = page.locator("button.BaseButton--typeWrite, button[class*='BaseButton--typeWrite']").first
                if submit_btn.is_visible():
                    submit_btn.click()
                    submitted = True
                    print("[NAVER] Submitted via class selector.")
            except Exception as e:
                print(f"[NAVER] Submit class method failed: {e}")
            
            if not submitted:
                try:
                    # 방법 2: 텍스트로 찾기
                    page.get_by_text("등록", exact=True).first.click()
                    submitted = True
                    print("[NAVER] Submitted via text.")
                except Exception as e:
                    print(f"[NAVER] Submit text method failed: {e}")
            
            if not submitted:
                print("[NAVER] FAILED to submit.")
                page.screenshot(path="error_naver_submit.png")
                context.close()
                return False

            # 5. 등록 후 확인 팝업 처리 및 게시 완료 확인
            print("[NAVER] Waiting for post completion...")
            time.sleep(2)
            
            # 확인/등록 팝업이 있으면 클릭
            try:
                confirm_btn = page.locator("button:has-text('확인'), button:has-text('등록'), button:has-text('게시')")
                if confirm_btn.count() > 0 and confirm_btn.first.is_visible():
                    confirm_btn.first.click()
                    print("[NAVER] Clicked confirmation popup.")
                    time.sleep(2)
            except Exception as e:
                print(f"[NAVER] No confirmation popup: {e}")
            
            # 게시 완료 확인: URL이 articles/write에서 변경되었는지 확인
            time.sleep(3)
            current_url = page.url
            print(f"[NAVER] Current URL after submit: {current_url}")
            
            # 스크린샷 저장 (디버깅용)
            page.screenshot(path="debug_after_submit.png")
            print("[NAVER] Screenshot saved: debug_after_submit.png")
            
            # URL이 여전히 write 페이지면 게시 실패
            if "articles/write" in current_url:
                print("[NAVER] WARNING: Still on write page. Post may not have been submitted.")
                # 에러 메시지 확인
                try:
                    error_text = page.locator(".error-message, .alert, [class*='error'], [class*='warning']").first.text_content()
                    print(f"[NAVER] Error message found: {error_text}")
                except:
                    pass
                context.close()
                return False
            
            print(f"[NAVER] SUCCESS: Upload complete for {image_path}")
            context.close()
            return True

        except Exception as e:
            print(f"[NAVER] Unexpected Error: {e}")
            try:
                page.screenshot(path=f"error_naver_final.png")
            except:
                pass
            context.close()
            return False

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        upload_naver(sys.argv[1])
    else:
        print("Usage: python uploader_naver.py [image_path]")
