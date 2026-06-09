@echo off
cd /d "%USERPROFILE%\tools\A-Team"
"C:\Program Files\nodejs\node.exe" scripts\confluence-sync\daemon.mjs >> "%TEMP%\confluence-sync.log" 2>&1
