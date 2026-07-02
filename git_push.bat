@echo off
"C:\Program Files\Git\cmd\git.exe" config --global user.email "ai@neca.app"
"C:\Program Files\Git\cmd\git.exe" config --global user.name "AI Builder"
"C:\Program Files\Git\cmd\git.exe" init
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Initialize project with modern UI tool"
"C:\Program Files\Git\cmd\git.exe" branch -M main
"C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/Itsvi-ctor/NECA.git
"C:\Program Files\Git\cmd\git.exe" push -u origin main
