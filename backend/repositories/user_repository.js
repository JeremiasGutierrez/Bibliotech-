/**
 * @file user_repository.js
 * @brief Repositorio para la gestión de acceso a datos de cuentas de usuario y roles.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

 const db = require('../config/db');

 /**
  * @class UserRepository
  * @brief Maneja la persistencia de identidades encapsulando la lógica relacional subyacente.
  */
 class UserRepository 
 {
     /**
      * @brief Recupera un usuario específico utilizando su identificador único (username).
      * @param {string} username - Nombre de usuario a consultar.
      * @returns {Promise<Object|undefined>} Objeto de usuario (incluyendo el hash de su password y su rol) o undefined.
      * 
      * @details mysql2/promise devuelve siempre un array donde el primer elemento son las filas (rows) 
      * y el segundo son los campos (fields). Usamos desestructuración const [rows] = ... 
      * para extraer directamente los datos. Al usar 'CALL', el resultado está anidado en el primer índice.
      */
     async findByUsername(username) 
     {
         const [rows] = await db.execute('CALL sp_find_user_by_username(?)', [username]);
         return rows[0][0]; 
     }

     /** Obtiene el rol vigente para no depender de un claim de sesión desactualizado. */
     async findRoleById(userId)
     {
         const [rows] = await db.execute(
             'SELECT r.name AS role FROM users_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? ORDER BY r.id LIMIT 1',
             [userId]
         );
         return rows[0]?.role;
     }
 
     /**
      * @brief Crea un nuevo usuario y le asigna un rol en una operación atómica.
      * @param {string} username - Nombre del nuevo usuario.
      * @param {string} hashedPassword - Contraseña previamente encriptada (nunca en texto plano).
      * @param {string} role - Nombre del rol a asignar (por defecto 'client').
      * @returns {Promise<number>} ID autogenerado del usuario en la base de datos.
      */
     async create(username, hashedPassword, role = 'client', subject = null) 
     {
         const [rows] = await db.execute('CALL sp_create_user(?, ?, ?, ?)',[username, hashedPassword, role, subject]);
         return rows[0][0].insertId;
     }
     
     /**
      * @brief Retorna una lista global de todos los usuarios registrados en el sistema (Uso exclusivo de Admin).
      * @returns {Promise<Array>} Array de objetos con datos de usuarios (excluyendo contraseñas mediante el SP).
      */
     async findAll()
     { 
         const [rows] = await db.execute('CALL sp_find_all_users()'); 
         return rows[0]; 
     }

     async updateRole(userId, role, subject = null)
     {
         await db.execute('CALL sp_update_user_role(?, ?, ?)', [userId, role, subject]);
     }

     async countByRole(role)
     {
         const [rows] = await db.execute('CALL sp_count_users_by_role(?)', [role]);
         return Number(rows[0][0].total);
     }
 
     /**
      * @brief Elimina permanentemente una cuenta de usuario del sistema.
      * @param {number} id - Identificador de la cuenta a eliminar.
      * @returns {Promise<boolean>} Confirmación de éxito.
      * 
      * @note La integridad referencial en la base de datos (ON DELETE CASCADE) 
      * se encargará automáticamente de borrar los registros de la tabla intermedia 
      * 'users_roles' y los metadatos de sus libros en la tabla 'books'.
      */
     async delete(id) 
     {
         await db.execute('CALL sp_delete_user(?)', [id]);
         return true;
     }
 }
 
 module.exports = new UserRepository();
