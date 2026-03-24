@echo off
title StudyOS

echo Iniciando StudyOS...

:: Iniciar backend en segundo plano
start "StudyOS Backend" /min cmd /c "cd /d %~dp0backend && venv\Scripts\activate.bat && python -m uvicorn main:app --port 8000"

:: Esperar a que el backend arranque
timeout /t 4 /nobreak > nul

:: Abrir la app
start "" "%~dp0frontend\release\win-unpacked\StudyOS.exe"

exit