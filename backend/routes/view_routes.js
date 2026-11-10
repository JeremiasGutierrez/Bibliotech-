/**
 * @file view_routes.js
 * @brief Rutas de navegación del Frontend para servir pantallas HTML.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

 const express = require('express');
 const router = express.Router();
 const path = require('path');
 
 /**
  * @route GET /
 * @brief Presenta Bibliotech a quienes visitan el sitio.
  */
 router.get('/', (req, res) => {
     res.sendFile(path.join(__dirname, '../../frontend/html/home.html'));
 });

 router.get('/home', (req, res) => {
     res.sendFile(path.join(__dirname, '../../frontend/html/home.html'));
 });
 
 // --- PANTALLAS DE IDENTIDAD ---
 
 router.get('/login', (req, res) => {
     res.sendFile(path.join(__dirname, '../../frontend/html/login.html'));
 });
 
 router.get('/register', (req, res) => {
     res.sendFile(path.join(__dirname, '../../frontend/html/register.html'));
 });
 
 // --- PANELES PRIVADOS ---
 
 router.get('/client_dashboard', (req, res) => {
     res.sendFile(path.join(__dirname, '../../frontend/html/client_dashboard.html'));
 });
 
 router.get('/admin_dashboard', (req, res) => {
     res.sendFile(path.join(__dirname, '../../frontend/html/admin_dashboard.html'));
 });

 router.get('/teacher_dashboard', (req, res) => {
     res.sendFile(path.join(__dirname, '../../frontend/html/teacher_dashboard.html'));
 });
 
 /**
  * @brief Middleware "Catch-All" (Atrapa-todo) para el manejo de Errores 404 en la UI.
  * @details Al ubicarse al final del archivo, cualquier petición GET que no coincida 
  * con las rutas anteriores caerá aquí. 
  */
 router.use((req, res) => {
     // Si se está pidiendo un recurso físico estático (ej. un .css o .png faltante), devolvemos un 404 puro
     if (req.path.includes('.')) {
         return res.status(404).send('Recurso estático no encontrado');
     }
 
     // Si el usuario teclea una URL inventada (ej. /biblioteca_secreta), lo forzamos a volver al login
     res.status(404).sendFile(path.join(__dirname, '../../frontend/html/home.html'));
 });
 
 module.exports = router;
