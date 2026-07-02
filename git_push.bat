@echo off
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "fix: rename neca-tool.html to index.html to support Vercel root deployments"
"C:\Program Files\Git\cmd\git.exe" push origin main
