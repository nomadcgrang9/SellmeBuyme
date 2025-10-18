@echo off
cd /d "%~dp0"

REM 오늘 날짜 가져오기
for /f "tokens=1-3 delims=/" %%a in ('%date%') do (
    set today=%%a%%b%%c
)

REM 마지막 실행 날짜 확인
if exist last-run.txt (
    set /p lastrun=<last-run.txt
) else (
    set lastrun=none
)

REM 오늘 이미 실행했는지 확인
if "%lastrun%"=="%today%" (
    echo ========================================
    echo 오늘 이미 크롤링을 실행했습니다.
    echo 마지막 실행: %lastrun%
    echo 내일 다시 실행됩니다.
    echo ========================================
    timeout /t 3 >nul
    exit /b 0
)

echo ========================================
echo 셀미바이미 크롤러 자동 실행 시작
echo 시작 시간: %date% %time%
echo ========================================

echo.
echo [1/2] 성남교육지원청 크롤링 시작...
node index.js --source=seongnam
if %errorlevel% neq 0 (
    echo 오류: 성남교육지원청 크롤링 실패
) else (
    echo 완료: 성남교육지원청
)

echo.
echo [2/2] 경기도교육청 크롤링 시작...
node index.js --source=gyeonggi
if %errorlevel% neq 0 (
    echo 오류: 경기도교육청 크롤링 실패
) else (
    echo 완료: 경기도교육청
)

echo.
echo ========================================
echo 모든 크롤링 완료
echo 종료 시간: %date% %time%
echo ========================================

REM 오늘 날짜 저장 (다음 실행 방지)
echo %today% > last-run.txt

REM 로그 파일에 기록
echo %date% %time% - 크롤링 완료 >> crawl-log.txt

timeout /t 3 >nul
