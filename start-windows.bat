@echo off
rem Double-click to start the show on Windows: serves this folder locally and opens the control window.
rem Needs nothing beyond Windows 10/11 itself (+ Chrome or Edge). Close this window to stop.
title Oasis show server
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8123 -Open
if errorlevel 1 pause
