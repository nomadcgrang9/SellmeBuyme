@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM Check if already run today
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set today=%datetime:~0,8%

if exist last-run.txt (
    set /p lastrun=<last-run.txt
) else (
    set lastrun=none
)

if "%lastrun%"=="%today%" (
    echo ========================================
    echo Already ran today. Skipping...
    echo Last run: %lastrun%
    echo ========================================
    timeout /t 3 >nul
    exit /b 0
)

echo ========================================
echo Sellme Buyme Crawler Starting
echo Start time: %date% %time%
echo ========================================

echo.
echo [1/2] Seongnam Crawling...
node index.js --source=seongnam
if %errorlevel% neq 0 (
    echo ERROR: Seongnam failed
) else (
    echo SUCCESS: Seongnam
)

echo.
echo [2/2] Gyeonggi Crawling...
node index.js --source=gyeonggi
if %errorlevel% neq 0 (
    echo ERROR: Gyeonggi failed
) else (
    echo SUCCESS: Gyeonggi
)

echo.
echo ========================================
echo All crawling completed
echo End time: %date% %time%
echo ========================================

REM Save today's date
echo %today% > last-run.txt

REM Log to file
echo %date% %time% - Crawling completed >> crawl-log.txt

timeout /t 3 >nul
