from playwright.sync_api import sync_playwright
import time
import os
import config

def analyze():
    user_data_dir = os.path.join(os.getcwd(), 'user_data')
    
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=False,
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        page = context.pages[0] if context.pages else context.new_page()
        
        # 목록으로 이동 -> 글쓰기 클릭 (기존 로직 사용)
        list_url = f"https://cafe.naver.com/ArticleList.nhn?search.clubid={config.NAVER['CAFE_ID']}&search.menuid={config.NAVER['MENU_ID']}&search.boardtype=L"
        page.goto(list_url)
        page.wait_for_load_state("networkidle")

        main_frame = page.frame(name="cafe_main")
        if main_frame:
            try:
                write_btn = main_frame.locator("#writeArticleBtn").first
                if write_btn.is_visible():
                    write_btn.click()
                else:
                    main_frame.get_by_text("글쓰기").first.click()
            except:
                page.goto(f"{config.NAVER['CAFE_URL_PREFIX']}?clubid={config.NAVER['CAFE_ID']}&menuid={config.NAVER['MENU_ID']}")
        else:
             page.goto(f"{config.NAVER['CAFE_URL_PREFIX']}?clubid={config.NAVER['CAFE_ID']}&menuid={config.NAVER['MENU_ID']}")

        print("Waiting for editor to load (10s)...")
        time.sleep(10)
        
        # 다시 프레임 찾기
        editor_frame = page.frame(name="cafe_main")
        
        if editor_frame:
            print("Found 'cafe_main' frame.")
            # HTML 덤프
            html_content = editor_frame.content()
            with open("naver_editor_dump.html", "w", encoding="utf-8") as f:
                f.write(html_content)
            print("Saved 'naver_editor_dump.html'")
            
            # 스크린샷
            page.screenshot(path="naver_editor_view.png")
            print("Saved 'naver_editor_view.png'")
        else:
            print("Could not find 'cafe_main' frame on write page.")
            page.screenshot(path="naver_editor_no_frame.png")
            
        context.close()

if __name__ == "__main__":
    analyze()
