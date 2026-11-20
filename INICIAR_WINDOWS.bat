@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo No se encontro Node.js. Instala Node.js 20 o superior desde https://nodejs.org/
 pause
 exit /b 1
)
echo ====================================
echo        REPOSITORIO DE ARTE
echo ====================================
echo.
echo Abre http://localhost:3000 en tu navegador.
echo.
echo Usuario administrador: admin
echo Contrasena inicial: admin123
echo.
echo Para cerrar el servidor, presiona Ctrl + C.
echo.
npm start
pause
