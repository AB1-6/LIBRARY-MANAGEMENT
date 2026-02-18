@echo off
REM ENTITY - Library Management System
REM This batch file starts the HTTP server and opens the application in the browser

echo.
echo ========================================
echo   ENTITY - Starting Server
echo ========================================
echo.

REM Change to the ENTITY directory
cd /d "%~dp0"

REM Check if http-server is installed, if not install it
where http-server >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing http-server globally...
    call npm install -g http-server
)

REM Start the HTTP server on port 8000
echo Starting HTTP server on port 8000...
echo.
echo Server is running at: http://localhost:8000/
echo.
echo Press Ctrl+C to stop the server
echo.

REM Kill any existing process on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do (
    taskkill /PID %%a /F 2>nul
)

REM Wait a moment for the port to be released
timeout /t 1 /nobreak >nul

REM Start the server
start http://localhost:8000/
call npx http-server -p 8000 --cors

pause
