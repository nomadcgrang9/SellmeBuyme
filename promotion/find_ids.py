from playwright.sync_api import sync_playwright
import urllib.parse

def main():
    print("==========================================")
    print("   [ 카페/게시판 ID 찾기 도우미 ]")
    print("==========================================")
    print("1. 브라우저가 열리면 네이버/다음 카페에 접속하세요.")
    print("2. 글을 올리고 싶은 '게시판'을 클릭해서 들어가세요.")
    print("3. 게시판 목록이 보이는 상태에서 터미널로 돌아와 엔터를 누르세요.")
    print("==========================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto("https://www.naver.com") # 시작 페이지
        
        input("게시판에 진입하셨나요? 엔터를 누르면 현재 URL에서 ID를 추출합니다...")
        
        current_url = page.url
        print(f"\n[분석 중] 현재 URL: {current_url}")
        
        parsed = urllib.parse.urlparse(current_url)
        params = urllib.parse.parse_qs(parsed.query)
        
        # 네이버 분석
        if "cafe.naver.com" in current_url:
            clubid = params.get("search.clubid", ["못찾음"])[0]
            if clubid == "못찾음":
                 clubid = params.get("clubid", ["못찾음"])[0]
                 
            menuid = params.get("search.menuid", ["못찾음"])[0]
            if menuid == "못찾음":
                menuid = params.get("menuid", ["못찾음"])[0]
            
            print(f"\n>>>> [네이버 카페 정보] <<<<")
            print(f"CAFE_ID (clubid): {clubid}")
            print(f"MENU_ID (menuid): {menuid}")
            
            if clubid == "못찾음":
                print("(팁: '게시판' 메뉴를 클릭한 상태의 URL이어야 정확합니다.)")

        # 다음 분석
        elif "cafe.daum.net" in current_url:
            # https://cafe.daum.net/CAFE_NAME/_c21_/bfs_list?grpid=...&fldid=...
            # grpid, fldid (게시판ID)
            grpid = params.get("grpid", ["못찾음"])[0]
            fldid = params.get("fldid", ["못찾음"])[0]
            
            # URL path에서 cafe_name 추출
            path_parts = parsed.path.split('/')
            cafe_name = "못찾음"
            if len(path_parts) > 1:
                cafe_name = path_parts[1]

            print(f"\n>>>> [다음 카페 정보] <<<<")
            print(f"CAFE_NAME: {cafe_name}")
            print(f"GRPID: {grpid}")
            print(f"FLDID (게시판ID): {fldid}")
        
        else:
            print("네이버나 다음 카페 URL이 아닌 것 같습니다.")
            
        print("\n------------------------------------------")
        print("위 정보를 config.py에 복사해서 사용하세요.")
        print("------------------------------------------")
        
        browser.close()

if __name__ == "__main__":
    main()
