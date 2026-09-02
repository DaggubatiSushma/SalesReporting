@echo off
title Sales Reporting Dashboard – Server
color 0A
set PORT=%~1
if "%PORT%"=="" set PORT=8080
call :find_port
echo.
echo  =============================================
echo   Sales Reporting Dashboard
echo  =============================================
echo.
echo  Detecting runtime environment...
echo.

set PYTHON_EXE=
if exist "%~dp0.venv\Scripts\python.exe" set PYTHON_EXE=%~dp0.venv\Scripts\python.exe
if not defined PYTHON_EXE where python >nul 2>&1 && set PYTHON_EXE=python

if defined PYTHON_EXE (
  echo  [OK] Python found
  echo.
  echo  -----------------------------------------------
  echo   Server : http://localhost:%PORT%
  echo   Network: http://%COMPUTERNAME%:%PORT%
  echo  -----------------------------------------------
  echo.
  echo  Installing/validating Python dependencies...
  "%PYTHON_EXE%" -m pip install -r "%~dp0requirements.txt"
  if errorlevel 1 goto :error
  echo.
  echo  Press Ctrl+C to stop the server
  echo.
  "%PYTHON_EXE%" "%~dp0main.py" --port %PORT%
  goto   :find_port
  netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul
  if not errorlevel 1 (
    set /A PORT=%PORT%+1
    goto :find_port
  )
  goto :eof

  :done
)

echo  [ERROR] Python was not found.
echo.
echo  Install Python : https://python.org/downloads
echo.
pause
goto :done

:error
echo.
echo  [ERROR] Failed to install dependencies or start the server.
echo.
pause

:done
