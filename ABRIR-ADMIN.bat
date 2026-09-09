@echo off
REM ENTRADA 2 - PANEL ADMINISTRADOR (solo dueno)
REM Abre el panel privado de gestion en el navegador.
start "" "http://localhost:3000/admin.html"
echo Admin: http://localhost:3000/admin.html  (admin.html -^> AdminApp)
echo Si el servidor no esta corriendo, ejecuta: npm run dev
pause
