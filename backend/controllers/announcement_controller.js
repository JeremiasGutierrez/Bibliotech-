const announcementRepository = require('../repositories/announcement_repository');
const fileHelper = require('../utils/file_helper/file_helper');
const path = require('path');

class AnnouncementController {
    async create(req, res, next) {
        try {
            const { title, content } = req.body;
            const attachmentPath = req.file ? `/uploads/${req.file.filename}` : null;
            const id = await announcementRepository.create(req.userId, title.trim(), content.trim(), attachmentPath);
            res.status(201).json({ id, message: 'La publicación fue enviada a los estudiantes.' });
        } catch (error) {
            if (req.file) fileHelper.deleteFile(`/uploads/${req.file.filename}`);
            next(error);
        }
    }

    async listForStudent(req, res, next) {
        try {
            res.json(await announcementRepository.findForStudent(req.userId));
        } catch (error) {
            next(error);
        }
    }

    async markRead(req, res, next) {
        try {
            const changed = await announcementRepository.markRead(req.userId, req.params.id);
            if (!changed) return res.status(404).json({ message: 'No se encontró esa notificación.' });
            res.json({ message: 'Notificación marcada como leída.' });
        } catch (error) {
            next(error);
        }
    }

    async downloadAttachment(req, res, next) {
        try {
            const attachment = await announcementRepository.findAttachment(req.params.id, req.userId);
            if (!attachment) return res.status(404).json({ message: 'No hay un archivo disponible para esta publicación.' });
            const filename = path.basename(attachment);
            res.type('application/pdf');
            res.setHeader('Content-Disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${filename.replace(/["\\]/g, '_')}"`);
            res.sendFile(path.join(__dirname, '../uploads', filename));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AnnouncementController();
