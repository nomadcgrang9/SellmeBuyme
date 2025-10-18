@echo off
echo Windows 작업 스케줄러 등록 중...

REM 기존 작업이 있으면 삭제
schtasks /delete /tn "셀미바이미_크롤러" /f 2>nul

REM 새 작업 등록 (매일 새벽 5시)
schtasks /create /tn "셀미바이미_크롤러" /tr "%~dp0run-all-crawlers.bat" /sc daily /st 05:00 /ru "%username%" /rl highest

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 작업 스케줄러 등록 완료!
    echo.
    echo 작업명: 셀미바이미_크롤러
    echo 실행 시간: 매일 새벽 5시
    echo 실행 파일: run-all-crawlers.bat
    echo ========================================
    echo.
    echo 확인 방법:
    echo 1. Windows 검색에서 "작업 스케줄러" 입력
    echo 2. 작업 스케줄러 라이브러리에서 "셀미바이미_크롤러" 찾기
    echo 3. 마우스 우클릭 - "실행" 클릭하면 지금 바로 테스트 가능
    echo.
) else (
    echo.
    echo 오류: 작업 스케줄러 등록 실패
    echo 관리자 권한으로 다시 실행해 주세요.
    echo.
)

pause
