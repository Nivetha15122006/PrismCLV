@echo off
title PrismCLV Local Server
echo ========================================================
echo Starting PrismCLV Single-Port Application on port 8000...
echo ========================================================
cd /d "%~dp0"
.\venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
pause
