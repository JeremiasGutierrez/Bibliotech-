/**
 * @file admin_controller.js
 * @brief Controlador para la gestión y administración de usuarios del sistema.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

 const userRepository = require('../repositories/user_repository');
 const bookRepository = require('../repositories/book_repository');
 const fileHelper = require('../utils/file_helper/file_helper');
 const i18n = require('../utils/i18n/i18n'); // Inyección del gestor de idiomas
 const bcrypt = require('bcrypt');
 const announcementRepository = require('../repositories/announcement_repository');
 const path = require('path');
 
 /**
  * @class AdminController
  * @brief Agrupa la lógica de negocio para operaciones de alto privilegio (Administrador).
  */
 class AdminController 
 {
     async getAllBooks(req, res, next) {
         try {
             const [books, attachments] = await Promise.all([
                 bookRepository.findAll(),
                 announcementRepository.findAllWithAttachments()
             ]);
             const bookPaths = new Set(books.map(item => item.file_path));
             res.json([
                 ...books.map(item => ({ ...item, kind: 'book' })),
                 ...attachments.filter(item => !bookPaths.has(item.attachment_path)).map(item => ({
                     id: item.id,
                     title: item.title,
                     author: 'Adjunto de aviso',
                     category: 'Material docente',
                     subject: item.subject,
                     owner: item.owner,
                     created_at: item.created_at,
                     kind: 'announcement'
                 }))
             ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
         } catch (error) {
             next(error);
         }
     }

     async deleteBook(req, res, next) {
         try {
             const books = await bookRepository.findAll();
             const book = books.find(item => Number(item.id) === Number(req.params.id));
             if (!book) return res.status(404).json({ message: 'No se encontró el documento.' });
             await announcementRepository.deleteByAttachment(book.file_path);
             await bookRepository.deleteByAdmin(book.id);
             fileHelper.deleteFile(book.file_path);
             res.json({ message: 'Documento y archivo eliminados.' });
         } catch (error) {
             next(error);
         }
     }

     async downloadAnnouncementAttachment(req, res, next) {
         try {
             const attachment = await announcementRepository.findAttachmentById(req.params.id);
             if (!attachment) return res.status(404).json({ message: 'No se encontró el archivo adjunto.' });
             const filename = path.basename(attachment);
             res.type('application/pdf');
             res.setHeader('Content-Disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${filename.replace(/["\\]/g, '_')}"`);
             res.sendFile(path.join(__dirname, '../uploads', filename));
         } catch (error) {
             next(error);
         }
     }

     async deleteAnnouncement(req, res, next) {
         try {
             const attachment = await announcementRepository.findAttachmentById(req.params.id);
             const deleted = await announcementRepository.deleteByAdmin(req.params.id);
             if (!deleted) return res.status(404).json({ message: 'No se encontró el documento.' });
             if (attachment) fileHelper.deleteFile(attachment);
             res.json({ message: 'Publicación y archivo adjunto eliminados.' });
         } catch (error) {
             next(error);
         }
     }

     async updateUserRole(req, res, next) {
         try {
             const userId = Number(req.params.id);
             const { role, subject } = req.body || {};
             if (!Number.isInteger(userId) || userId < 1 || !['admin', 'teacher', 'client'].includes(role)) {
                 return res.status(400).json({ message: 'Elegí un usuario y un rol válido.' });
             }
             const normalizedSubject = typeof subject === 'string' ? subject.trim() : '';
             if (role === 'teacher' && (!normalizedSubject || normalizedSubject.length > 100)) {
                 return res.status(400).json({ message: 'Indicá la materia del docente (máximo 100 caracteres).' });
             }
             const users = await userRepository.findAll();
             const target = users.find(user => Number(user.id) === userId);
             if (!target) return res.status(404).json({ message: 'No se encontró el usuario.' });
             if (userId === req.userId && role !== 'admin') {
                 return res.status(403).json({ message: 'No podés quitarte el rol de administrador desde tu propia sesión.' });
             }
             if (target.role === 'admin' && role !== 'admin' && await userRepository.countByRole('admin') <= 1) {
                 return res.status(409).json({ message: 'Debe quedar al menos un administrador activo.' });
             }
             await userRepository.updateRole(userId, role, role === 'teacher' ? normalizedSubject : null);
             res.json({ message: 'Rol actualizado.' });
         } catch (error) {
             next(error);
         }
     }

     async createUser(req, res, next) {
         try {
             const { username, password, role, subject } = req.body || {};
             if (typeof username !== 'string' || !/^[\p{L}\p{N}._-]{3,50}$/u.test(username.trim())) {
                 return res.status(400).json({ message: 'El usuario debe tener entre 3 y 50 letras, números, puntos, guiones o guiones bajos.' });
             }
             if (typeof password !== 'string' || password.length < 8) {
                 return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
             }
             if (!['teacher', 'client'].includes(role)) {
                 return res.status(400).json({ message: 'El rol debe ser teacher o client.' });
             }
             const normalizedSubject = typeof subject === 'string' ? subject.trim() : '';
             if (role === 'teacher' && (!normalizedSubject || normalizedSubject.length > 100)) {
                 return res.status(400).json({ message: 'Indicá la materia del docente (máximo 100 caracteres).' });
             }
             const userId = await userRepository.create(
                 username.trim(), await bcrypt.hash(password, 10), role,
                 role === 'teacher' ? normalizedSubject : null
             );
             res.status(201).json({ userId, message: 'Cuenta creada correctamente.' });
         } catch (error) {
             next(error);
         }
     }

     /**
      * @brief Obtiene la lista completa de usuarios registrados y sus roles.
      * @param {Object} req - Petición HTTP.
      * @param {Object} res - Respuesta HTTP.
      * @param {Function} next - Función para delegar errores al Global Error Handler.
      */
     async getAllUsers(req, res, next)
     {
         try 
         {
             const users = await userRepository.findAll();
             res.json(users);
         }
         catch (error) 
         {
             next(error);
         }
     }
 
     /**
      * @brief Elimina un usuario del sistema y realiza una limpieza en cascada 
      * física de todos los documentos PDF asociados a él.
      * @param {Object} req - Petición HTTP (espera req.params.id y req.userId).
      * @param {Object} res - Respuesta HTTP.
      * @param {Function} next - Función para delegar errores al Global Error Handler.
      */
     async deleteUser(req, res, next)
     {
         try 
         {
             const targetUserId = req.params.id;
             const adminId = req.userId; 
 
             // Regla de Negocio Semántica: Evitar auto-eliminación
             if (targetUserId == adminId) 
             {
                 const message = i18n.getMessage('CT_ADMIN_CANT_DELETE_SELF');
                 return res.status(403).json({ message });
             }

             const targetUser = (await userRepository.findAll()).find(user => Number(user.id) === Number(targetUserId));
             if (!targetUser) {
                 const message = i18n.getMessage('CT_ADMIN_USER_NOT_FOUND');
                 return res.status(404).json({ message });
             }
             if (targetUser.role === 'admin' && await userRepository.countByRole('admin') <= 1) {
                 return res.status(409).json({ message: 'Debe quedar al menos un administrador activo.' });
             }
 
             // Obtener todos los libros cargados por el usuario objetivo antes de borrarlo
             const userBooks = await bookRepository.findByUserId(targetUserId);
             const announcementFiles = await announcementRepository.findFilesByAuthor(targetUserId);
             
             // Eliminar de la base de datos (se produce cascada a nivel de tabla 'books')
             const success = await userRepository.delete(targetUserId);
 
             if (!success) 
             {
                 const message = i18n.getMessage('CT_ADMIN_USER_NOT_FOUND');
                 return res.status(404).json({ message });
             }
 
             // Limpieza física: Eliminar almacenamiento en disco
             [...new Set([...userBooks.map(book => book.file_path), ...announcementFiles])]
                 .forEach(filePath => fileHelper.deleteFile(filePath));
 
             // Reemplazo dinámico (%s) para mostrar la cantidad de archivos borrados
             const message = i18n.getMessage('CT_ADMIN_USER_DELETED').replace('%s', userBooks.length);
             res.json({ message });
         } 
         catch (error) 
         {
             next(error);
         }
     }
 }
 
 module.exports = new AdminController();
