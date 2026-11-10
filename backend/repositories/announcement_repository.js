const db = require('../config/db');

class AnnouncementRepository {
    async create(authorId, title, content, attachmentPath) {
        const [rows] = await db.execute('CALL sp_create_announcement(?, ?, ?, ?)', [
            authorId, title, content, attachmentPath
        ]);
        return rows[0][0].insertId;
    }

    async findForStudent(studentId) {
        const [rows] = await db.execute('CALL sp_get_announcements_for_student(?)', [studentId]);
        return rows[0];
    }

    async markRead(studentId, announcementId) {
        const [rows] = await db.execute('CALL sp_mark_announcement_read(?, ?)', [studentId, announcementId]);
        return Boolean(rows[0][0].found);
    }

    async findAttachment(announcementId, userId) {
        const [rows] = await db.execute('CALL sp_find_announcement_attachment(?, ?)', [announcementId, userId]);
        return rows[0][0]?.attachment_path;
    }

    async findAllWithAttachments() {
        const [rows] = await db.execute('CALL sp_find_all_announcement_attachments()');
        return rows[0];
    }

    async findAttachmentById(announcementId) {
        const [rows] = await db.execute('CALL sp_find_announcement_attachment_by_id(?)', [announcementId]);
        return rows[0][0]?.attachment_path;
    }

    async deleteByAdmin(announcementId) {
        const [rows] = await db.execute('CALL sp_delete_announcement_by_admin(?)', [announcementId]);
        return rows[0][0].affectedRows > 0;
    }

    async deleteByAttachment(path) {
        await db.execute('CALL sp_delete_announcements_by_attachment(?)', [path]);
    }

    async findFilesByAuthor(authorId) {
        const [rows] = await db.execute('CALL sp_find_announcement_files_by_author(?)', [authorId]);
        return rows[0].map(row => row.attachment_path);
    }
}

module.exports = new AnnouncementRepository();
