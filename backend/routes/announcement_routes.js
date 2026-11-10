const express = require('express');
const router = express.Router();
const controller = require('../controllers/announcement_controller');
const upload = require('../config/multer_config');
const { verifyToken, isTeacher, isStudent } = require('../middleware/auth_middleware');

router.use(verifyToken);
router.get('/', isStudent, controller.listForStudent);
router.get('/:id/file', controller.downloadAttachment);
router.patch('/:id/read', isStudent, controller.markRead);
router.post('/', isTeacher, upload.announcement, (req, res, next) => {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!title || title.length > 120 || !content || content.length > 10000) {
        if (req.file) require('../utils/file_helper/file_helper').deleteFile(`/uploads/${req.file.filename}`);
        return res.status(400).json({ message: 'El título (máximo 120 caracteres) y el contenido (máximo 10.000) son obligatorios.' });
    }
    next();
}, controller.create);

module.exports = router;
