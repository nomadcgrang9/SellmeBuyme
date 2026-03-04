from playwright.sync_api import sync_playwright
import os
import time

# 현재 작업 디렉토리 기준 'user_data' 폴더 절대 경로
USER_DATA_DIR = os.path.join(os.getcwd(), 'user_data')

def login_naver():
    print(f"User Data Directory: {USER_DATA_DIR}")
    with sync_playwright() as p:
        # 영구적인 컨텍스트 생성 (로그인 정보 저장용)
        # headless=False로 브라우저를 띄워 사용자가 직접 로그인하게 함
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
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
        
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)
        page.goto("https://nid.naver.com/nidlogin.login")
        
        print("==========================================")
        print("브라우저가 열렸습니다.")
        print("네이버에 로그인해주세요.")
        print("로그인이 완료되면, 이 터미널에서 엔터 키를 눌러주세요.")
        print("==========================================")
        input() 
        
        # 로그인 후 카페 페이지로 이동하여 세션 쿠키 확립
        print("카페 페이지로 이동 중...")
        page.goto("https://cafe.naver.com")
        time.sleep(2)
        
        # 글쓰기 페이지까지 접속 시도 (권한 쿠키 갱신)
        page.goto("https://cafe.naver.com/ca-fe/cafes/31663454/articles/write?boardType=L&menuId=1")
        time.sleep(2)
        
        print("==========================================")
        print("글쓰기 페이지가 보이는지 확인해주세요.")
        print("확인 후 엔터 키를 눌러 세션을 저장합니다.")
        print("==========================================")
        input()
        
        print("네이버 로그인 세션이 저장되었습니다.")
        context.close()

def login_daum():
    print(f"User Data Directory: {USER_DATA_DIR}")
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False,
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        page = context.pages[0] if context.pages else context.new_page()
        # 다음은 카카오 계정 로그인 페이지로 이동
        page.goto("https://accounts.kakao.com/login?continue=https%3A%2F%2Fwww.daum.net")
        
        print("==========================================")
        print("브라우저가 열렸습니다.")
        print("다음(카카오)에 로그인해주세요.")
        print("로그인이 완료되고 다음 메인 페이지가 보이면,")
        print("이 터미널에서 엔터 키를 눌러주세요.")
        print("==========================================")
        input()
        
        print("다음 로그인 세션이 저장되었습니다.")
        context.close()

if __name__ == "__main__":
    print("------------------------------------------")
    print("   [ 카페 자동 업로드 - 초기 로그인 설정 ]")
    print("------------------------------------------")
    print("1. 네이버 로그인 (세션 저장)")
    print("2. 다음 로그인 (세션 저장)")
    print("------------------------------------------")
    
    choice = input("선택하세요 (1 또는 2): ").strip()
    
    if choice == "1":
        login_naver()
    elif choice == "2":
        login_daum()
    else:
        print("잘못된 선택입니다.")
