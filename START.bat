@echo off
echo ==============================================
echo   DX-BA Hub v2 - DEGO Holding Team DX
echo ==============================================
echo.
echo Dang kiem tra cac tien trinh cu...
taskkill /F /IM node.exe >nul 2>&1
del /F /Q ".next\dev\lock" >nul 2>&1
echo.
echo Dang khoi dong he thong...
echo Sau khi Ready, mo trinh duyet va truy cap:
echo   http://localhost:3000
echo.
echo Tai khoan demo:
echo   giang / giang123  (BA - toan quyen nhap lieu)
echo   dung  / ceo2024   (CEO - duyet, freeze)
echo   cuong / cuong123  (Dev - xem yeu cau)
echo   admin / dego2024  (Admin - quan tri)
echo.
cd /d %~dp0
npm run dev
pause
