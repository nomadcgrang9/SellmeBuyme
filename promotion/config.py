# 설정 파일
# 이 파일에서 카페 주소, 게시판 ID, 게시글 제목 등을 수정하세요.

# ==========================
# 공통 설정
# ==========================
# 게시글 제목 (고정)
POST_TITLE = "홍보 이미지 자료입니다." 

# 이미지 확장자 필터
IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

# ==========================
# 네이버 카페 설정
# ==========================
NAVER = {
    "ENABLE": False, # 사용 여부 (True로 변경하여 활성화)
    "CAFE_ID": "YOUR_CAFE_ID",  # URL에서 추출한 카페 ID (예: 12345678)
    "MENU_ID": "YOUR_MENU_ID", # URL에서 추출한 게시판 ID (예: 1)
    # 글쓰기 URL 예시: https://cafe.naver.com/ArticleWrite.nhn?clubid={CAFE_ID}&menuid={MENU_ID}
    "CAFE_URL_PREFIX": "https://cafe.naver.com/ArticleWrite.nhn"
}

# ==========================
# 다음 카페 설정
# ==========================
DAUM = {
    "ENABLE": False, # 사용 여부
    "CAFE_NAME": "YOUR_DAUM_CAFE_NAME", # 예: mycafe (http://cafe.daum.net/mycafe)
    "GRPID": "YOUR_DAUM_GRPID",         # 카페 고유 ID (페이지 소스에서 'grpid' 검색)
    "FLDID": "YOUR_BOARD_ID",           # 게시판 ID (URL의 bbsId 파라미터 등)
    # 글쓰기 URL은 동적으로 생성되거나, 직접 기입
}

# ==========================
# 스케줄링 설정
# ==========================
# 몇 분마다 폴더를 검사할지 설정 (초 단위)
CHECK_INTERVAL_SECONDS = 60
