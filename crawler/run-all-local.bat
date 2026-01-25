@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cls

echo ====================================
echo 🚀 35개 크롤러 로컬 전체 실행
echo ====================================
echo 시작 시간: %date% %time%
echo.
echo ⚠️  주의사항:
echo   - 전체 소요시간: 약 30-60분 예상
echo   - Supabase DB에 실제 등록됩니다
echo   - 중간에 중단하려면 Ctrl+C
echo.
pause

set SOURCES=seoul busan daegu incheon gwangju daejeon ulsan sejong gyeonggi gangwon chungbuk chungnam jeonbuk jeonnam gyeongbuk gyeongnam jeju seongnam goyang uijeongbu namyangju bucheon gimpo gwangmyeong gwangjuhanam gurinamyangju anseong pyeongtaek paju yangpyeong pocheon yeoncheon dongducheonyangjyu gapyeong1 gapyeong2

set COUNT=0
set SUCCESS=0
set FAILED=0

echo.
echo 실행 시작...
echo ====================================

for %%s in (%SOURCES%) do (
    set /a COUNT+=1
    echo.
    echo [!COUNT!/35] %%s 크롤링 시작...
    echo ------------------------------------
    node index.js --source=%%s
    if errorlevel 1 (
        echo ❌ %%s 실패
        set /a FAILED+=1
    ) else (
        echo ✅ %%s 완료
        set /a SUCCESS+=1
    )
    echo.
    timeout /t 1 /nobreak >nul
)

echo.
echo ====================================
echo 🎉 전체 실행 완료
echo ====================================
echo 종료 시간: %date% %time%
echo.
echo 📊 실행 결과:
echo   - 성공: !SUCCESS!/35
echo   - 실패: !FAILED!/35
echo ====================================
echo.
pause
