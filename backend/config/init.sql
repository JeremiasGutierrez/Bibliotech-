/*
 * @file init.sql
 * @brief Script de inicialización (Bootstrap) de la base de datos, tablas y procedimientos.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

/* 
 * @details Configuración repetible del entorno. El esquema reutiliza las tablas
 * que ya existen y agrega las nuevas sin vaciar los datos almacenados.
 */
SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- 1. Crear o reutilizar la base de datos sin destruir datos existentes
CREATE DATABASE IF NOT EXISTS bibliotech;
USE bibliotech;

/*
 * @brief 2. Configuración de Seguridad y Creación de Usuario
 * @note Principio de Menor Privilegio (PoLP): La aplicación Node.js NO debe 
 * conectarse como 'root'. Le creamos un usuario dedicado que SOLO tiene permiso 
 * para ejecutar Procedimientos Almacenados (EXECUTE) y leer vistas/tablas (SELECT). 
 * Este usuario NO puede hacer DROP, ALTER ni DELETE directo.
 */
CREATE USER IF NOT EXISTS 'bibliotech'@'localhost' IDENTIFIED BY 'bibliotech';
ALTER USER 'bibliotech'@'localhost' IDENTIFIED BY 'bibliotech';
GRANT SELECT, EXECUTE ON bibliotech.* TO 'bibliotech'@'localhost';

/*
 * @brief 3. Tablas maestras y transaccionales
 */

-- Tabla de Roles (Normalización)
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
    user_id INT PRIMARY KEY,
    subject VARCHAR(100) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

/*
 * @brief 5. Relación Muchos a Muchos (N:M)
 * @details Tabla intermedia o pivot. 
 * @note Integridad Referencial: ON DELETE CASCADE asegura que si borramos un 
 * usuario, sus asignaciones de roles se destruyan automáticamente, evitando 
 * registros huérfanos (Orphaned Records).
 */
CREATE TABLE IF NOT EXISTS users_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

/*
 * @brief 6. Tabla de Libros/Documentos (Relación 1:N con Usuarios)
 */
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    title VARCHAR(100) NOT NULL,
    author VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    pages INT DEFAULT 0,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Inserción de Roles Maestros
INSERT IGNORE INTO roles (name) VALUES ('admin'), ('teacher'), ('client');

/*
 * @brief 8. Datos Semilla (Seed Data) para desarrollo
 * @warning Las contraseñas están hasheadas con bcrypt ($2b$10$...). 
 * En texto plano equivalen a '12345'.
 */
INSERT IGNORE INTO users (username, password) VALUES ('admin', '$2b$10$.n0s847tiSxBqDvIo6Vg5ujXC5zIUmm98bTjBWnRdqX9CxxbIo7wS');
INSERT IGNORE INTO users_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.name = 'admin'
WHERE u.username = 'admin' AND NOT EXISTS (SELECT 1 FROM users_roles ur WHERE ur.user_id = u.id);

INSERT IGNORE INTO users (username, password) VALUES ('pepe', '$2b$10$.n0s847tiSxBqDvIo6Vg5ujXC5zIUmm98bTjBWnRdqX9CxxbIo7wS');
INSERT IGNORE INTO users_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.name = 'client'
WHERE u.username = 'pepe' AND NOT EXISTS (SELECT 1 FROM users_roles ur WHERE ur.user_id = u.id);

-- Publicaciones docentes y notificaciones persistentes para cada estudiante.
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT NOT NULL,
    title VARCHAR(120) NOT NULL,
    content TEXT NOT NULL,
    attachment_path VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    announcement_id INT NOT NULL,
    read_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_announcement (student_id, announcement_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
);


/*
 * ==========================================================
 * 9. PROCEDIMIENTOS ALMACENADOS (Stored Procedures)
 * ==========================================================
 * 
 * @details Un Procedimiento Almacenado encapsula la lógica de negocio en la 
 * base de datos. 
 * @note DELIMITER // : Cambiamos el delimitador estándar (;) por (//) temporalmente.
 * Esto permite que MySQL entienda que los (;) dentro del bloque BEGIN...END 
 * son parte de las instrucciones del procedimiento y no el final del CREATE PROCEDURE.
 */

DELIMITER //

DROP PROCEDURE IF EXISTS sp_find_user_by_username //
DROP PROCEDURE IF EXISTS sp_create_user //
DROP PROCEDURE IF EXISTS sp_find_all_users //
DROP PROCEDURE IF EXISTS sp_delete_user //
DROP PROCEDURE IF EXISTS sp_create_book //
DROP PROCEDURE IF EXISTS sp_find_books_by_user //
DROP PROCEDURE IF EXISTS sp_find_book_by_id //
DROP PROCEDURE IF EXISTS sp_delete_book //
DROP PROCEDURE IF EXISTS sp_create_announcement //
DROP PROCEDURE IF EXISTS sp_get_announcements_for_student //
DROP PROCEDURE IF EXISTS sp_mark_announcement_read //
DROP PROCEDURE IF EXISTS sp_find_all_books //
DROP PROCEDURE IF EXISTS sp_delete_book_by_admin //
DROP PROCEDURE IF EXISTS sp_find_book_visible_to_user //
DROP PROCEDURE IF EXISTS sp_find_announcement_attachment //
DROP PROCEDURE IF EXISTS sp_update_user_role //
DROP PROCEDURE IF EXISTS sp_count_users_by_role //
DROP PROCEDURE IF EXISTS sp_find_library_books //
DROP PROCEDURE IF EXISTS sp_find_all_announcement_attachments //
DROP PROCEDURE IF EXISTS sp_find_announcement_attachment_by_id //
DROP PROCEDURE IF EXISTS sp_delete_announcement_by_admin //
DROP PROCEDURE IF EXISTS sp_delete_announcements_by_attachment //
DROP PROCEDURE IF EXISTS sp_find_announcement_files_by_author //

-- --- PROCEDIMIENTOS PARA USERS ---

/*
 * @brief Busca usuario por username y resuelve su rol mediante JOINs.
 * @param p_username Nombre de usuario exacto.
 */
CREATE PROCEDURE sp_find_user_by_username(IN p_username VARCHAR(50))
BEGIN
    SELECT u.*, r.name as role 
    FROM users u
    JOIN users_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.username = p_username;
END //

/*
 * @brief Crea un nuevo usuario y su relación con un rol específico en una transacción implícita.
 * @param p_username Nombre del usuario.
 * @param p_password Hash bcrypt de la contraseña.
 * @param p_role_name Nombre del rol (ej: 'client').
 */
CREATE PROCEDURE sp_create_user(
    IN p_username VARCHAR(50), 
    IN p_password VARCHAR(255), 
    IN p_role_name VARCHAR(20),
    IN p_subject VARCHAR(100)
)
BEGIN
    DECLARE v_user_id INT;
    DECLARE v_role_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_role_name NOT IN ('admin', 'teacher', 'client') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown role';
    END IF;
    IF p_role_name = 'teacher' AND (p_subject IS NULL OR TRIM(p_subject) = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Teacher subject is required';
    END IF;

    SET v_role_id = (SELECT id FROM roles WHERE name = p_role_name LIMIT 1);
    START TRANSACTION;

    INSERT INTO users (username, password) VALUES (p_username, p_password);
    SET v_user_id = LAST_INSERT_ID();
    INSERT INTO users_roles (user_id, role_id) VALUES (v_user_id, v_role_id);
    IF p_role_name = 'teacher' THEN
        INSERT INTO teacher_profiles (user_id, subject) VALUES (v_user_id, TRIM(p_subject));
    END IF;
    COMMIT;
    SELECT v_user_id as insertId;
END //

-- Listar todos los usuarios con su rol
CREATE PROCEDURE sp_find_all_users()
BEGIN
    SELECT u.id, u.username, r.name as role, tp.subject, u.created_at 
    FROM users u
    JOIN users_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    LEFT JOIN teacher_profiles tp ON tp.user_id = u.id;
END //

-- Borrar usuario por ID
CREATE PROCEDURE sp_delete_user(IN p_id INT)
BEGIN
    DELETE FROM users WHERE id = p_id;
END //

-- --- PROCEDIMIENTOS PARA BOOKS ---

/*
 * @brief Registra los metadatos de un archivo PDF subido al servidor.
 */
CREATE PROCEDURE sp_create_book(
    IN p_user_id INT,
    IN p_filename VARCHAR(255),
    IN p_title VARCHAR(100),
    IN p_author VARCHAR(100),
    IN p_category VARCHAR(50),
    IN p_pages INT,
    IN p_file_path VARCHAR(255)
)
BEGIN
    INSERT INTO books (user_id, filename, title, author, category, pages, file_path)
    VALUES (p_user_id, p_filename, p_title, p_author, p_category, p_pages, p_file_path);
    SELECT LAST_INSERT_ID() as insertId;
END //

-- Listar libros asociados a un usuario específico
CREATE PROCEDURE sp_find_books_by_user(IN p_user_id INT)
BEGIN
    SELECT * FROM books WHERE user_id = p_user_id;
END //

CREATE PROCEDURE sp_find_library_books(IN p_user_id INT)
BEGIN
    SELECT DISTINCT b.*, owner.username AS owner,
           COALESCE(tp.subject, 'Sin materia') AS subject
    FROM books b
    JOIN users owner ON owner.id = b.user_id
    LEFT JOIN users_roles ur ON ur.user_id = owner.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN teacher_profiles tp ON tp.user_id = owner.id
    WHERE b.user_id = p_user_id OR r.name = 'teacher'
    ORDER BY b.created_at DESC;
END //

CREATE PROCEDURE sp_find_all_books()
BEGIN
    SELECT b.*, owner.username AS owner,
           COALESCE(tp.subject, 'Sin materia') AS subject
    FROM books b JOIN users owner ON owner.id = b.user_id
    LEFT JOIN teacher_profiles tp ON tp.user_id = owner.id
    ORDER BY b.created_at DESC;
END //

CREATE PROCEDURE sp_find_book_visible_to_user(IN p_book_id INT, IN p_user_id INT, IN p_user_role VARCHAR(20))
BEGIN
    SELECT DISTINCT b.*, owner.username AS owner
    FROM books b
    JOIN users owner ON owner.id = b.user_id
    LEFT JOIN users_roles ur ON ur.user_id = owner.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE b.id = p_book_id AND (
        p_user_role = 'admin'
        OR (p_user_role = 'teacher' AND b.user_id = p_user_id)
        OR (p_user_role = 'client' AND (b.user_id = p_user_id OR r.name = 'teacher'))
    );
END //

/*
 * @brief Busca un libro específico (Validando autoría)
 * @note Seguridad: Se exige el p_user_id para evitar que un cliente modifique 
 * un id en la URL y acceda a un libro que no le pertenece (Insecure Direct Object Reference).
 */
CREATE PROCEDURE sp_find_book_by_id(IN p_id INT, IN p_user_id INT)
BEGIN
    SELECT * FROM books WHERE id = p_id AND user_id = p_user_id;
END //

/*
 * @brief Borrar libro (Validando autoría)
 */
CREATE PROCEDURE sp_delete_book(IN p_id INT, IN p_user_id INT)
BEGIN
    DELETE FROM books WHERE id = p_id AND user_id = p_user_id;
END //

CREATE PROCEDURE sp_delete_book_by_admin(IN p_id INT)
BEGIN
    DELETE FROM books WHERE id = p_id;
    SELECT ROW_COUNT() AS affectedRows;
END //

-- Publica una noticia y crea su notificación para cada estudiante existente.
CREATE PROCEDURE sp_create_announcement(
    IN p_author_id INT,
    IN p_title VARCHAR(120),
    IN p_content TEXT,
    IN p_attachment_path VARCHAR(255)
)
BEGIN
    DECLARE v_announcement_id INT;
    START TRANSACTION;
    INSERT INTO announcements (author_id, title, content, attachment_path)
    VALUES (p_author_id, p_title, p_content, p_attachment_path);
    SET v_announcement_id = LAST_INSERT_ID();
    INSERT INTO notifications (student_id, announcement_id)
    SELECT ur.user_id, v_announcement_id
    FROM users_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE r.name = 'client';
    COMMIT;
    SELECT v_announcement_id AS insertId;
END //

CREATE PROCEDURE sp_get_announcements_for_student(IN p_student_id INT)
BEGIN
    SELECT a.id, a.title, a.content, a.attachment_path, a.created_at,
           u.username AS teacher, tp.subject, n.read_at,
           (n.read_at IS NULL) AS unread
    FROM notifications n
    JOIN announcements a ON a.id = n.announcement_id
    JOIN users u ON u.id = a.author_id
    LEFT JOIN teacher_profiles tp ON tp.user_id = a.author_id
    WHERE n.student_id = p_student_id
    ORDER BY a.created_at DESC;
END //

CREATE PROCEDURE sp_mark_announcement_read(IN p_student_id INT, IN p_announcement_id INT)
BEGIN
    UPDATE notifications
    SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
    WHERE student_id = p_student_id AND announcement_id = p_announcement_id;
    SELECT EXISTS(
        SELECT 1 FROM notifications
        WHERE student_id = p_student_id AND announcement_id = p_announcement_id
    ) AS found;
END //

CREATE PROCEDURE sp_find_announcement_attachment(IN p_announcement_id INT, IN p_user_id INT)
BEGIN
    SELECT a.attachment_path
    FROM announcements a
    LEFT JOIN notifications n ON n.announcement_id = a.id AND n.student_id = p_user_id
    WHERE a.id = p_announcement_id
      AND a.attachment_path IS NOT NULL
      AND (n.student_id IS NOT NULL OR a.author_id = p_user_id);
END //

CREATE PROCEDURE sp_find_all_announcement_attachments()
BEGIN
    SELECT a.id, a.title, a.attachment_path, a.created_at, u.username AS owner,
           COALESCE(tp.subject, 'Sin materia') AS subject
    FROM announcements a JOIN users u ON u.id = a.author_id
    LEFT JOIN teacher_profiles tp ON tp.user_id = a.author_id
    WHERE a.attachment_path IS NOT NULL
    ORDER BY a.created_at DESC;
END //

CREATE PROCEDURE sp_find_announcement_attachment_by_id(IN p_announcement_id INT)
BEGIN
    SELECT attachment_path FROM announcements WHERE id = p_announcement_id AND attachment_path IS NOT NULL;
END //

CREATE PROCEDURE sp_delete_announcement_by_admin(IN p_announcement_id INT)
BEGIN
    DELETE FROM announcements WHERE id = p_announcement_id;
    SELECT ROW_COUNT() AS affectedRows;
END //

CREATE PROCEDURE sp_delete_announcements_by_attachment(IN p_attachment_path VARCHAR(255))
BEGIN
    DELETE FROM announcements WHERE attachment_path = p_attachment_path;
END //

CREATE PROCEDURE sp_find_announcement_files_by_author(IN p_author_id INT)
BEGIN
    SELECT attachment_path FROM announcements
    WHERE author_id = p_author_id AND attachment_path IS NOT NULL;
END //

CREATE PROCEDURE sp_update_user_role(IN p_user_id INT, IN p_role_name VARCHAR(20), IN p_subject VARCHAR(100))
BEGIN
    DECLARE v_role_id INT DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    SET v_role_id = (SELECT id FROM roles WHERE name = p_role_name LIMIT 1);
    IF v_role_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown role';
    END IF;
    IF p_role_name = 'teacher' AND (p_subject IS NULL OR TRIM(p_subject) = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Teacher subject is required';
    END IF;
    START TRANSACTION;
    DELETE FROM users_roles WHERE user_id = p_user_id;
    INSERT INTO users_roles (user_id, role_id) VALUES (p_user_id, v_role_id);
    IF p_role_name = 'teacher' THEN
        INSERT INTO teacher_profiles (user_id, subject) VALUES (p_user_id, TRIM(p_subject))
        ON DUPLICATE KEY UPDATE subject = VALUES(subject);
    ELSE
        DELETE FROM teacher_profiles WHERE user_id = p_user_id;
    END IF;
    COMMIT;
    SELECT ROW_COUNT() AS changed;
END //

CREATE PROCEDURE sp_count_users_by_role(IN p_role_name VARCHAR(20))
BEGIN
    SELECT COUNT(DISTINCT ur.user_id) AS total
    FROM users_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE r.name = p_role_name;
END //

DELIMITER ;
SET foreign_key_checks = 1;
