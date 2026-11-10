/**
 * @file db_setup.js
 * @brief Script de inicialización automatizada (Bootstrap) de la base de datos usando DDL.
 * @project Bibliotech
 * @author Tecnologías Informáticas B - Facultad de Ingeniería - UNMdP
 * @license http://www.gnu.org/licenses/gpl.txt GNU GPL 3.0
 * @date Octubre 2026
 */

 require('dotenv').config();
 const mysql = require('mysql2/promise');
 const fs = require('fs');
 const path = require('path');
 
 /**
 * @brief Aplica de forma repetible el esquema de Bibliotech sin borrar la base existente.
  */
 async function run() {
     console.log("=================================================");
     console.log("⚡ Creando e Inicializando Base de Datos...");
     console.log("=================================================");
 
     const host = process.env.DB_ROOT_HOST || process.env.DB_HOST || '127.0.0.1';
     const rootUser = process.env.DB_ROOT_USER || 'root';
     const rootPass = process.env.DB_ROOT_PASS || '';
 
     let connection;
     try {
         // Conectar como root para poder crear la DB y otorgar permisos
         connection = await mysql.createConnection({
             host: host,
             port: Number(process.env.DB_ROOT_PORT || process.env.DB_PORT) || 3306,
             user: rootUser,
             password: rootPass,
             multipleStatements: true // Habilitar múltiples consultas en una sola llamada
         });

         const [grantMode] = await connection.query("SHOW VARIABLES LIKE 'skip_grant_tables'");
         if (String(grantMode[0]?.Value).toUpperCase() === 'ON') {
             throw new Error('MariaDB está en modo skip-grant-tables. Reinícialo en modo normal antes de preparar Bibliotech.');
         }
         
         const sqlPath = path.join(__dirname, '../../config/init.sql');
         const sqlContent = fs.readFileSync(sqlPath, 'utf8');
 
         console.log("📂 Aplicando init.sql (no elimina datos existentes)...");
 
         // El comando DELIMITER es una instrucción específica del cliente CLI de MySQL (como phpMyAdmin)
         // y arroja error de sintaxis cuando se envía directamente a través de drivers de programación.
         // Aquí lo limpiamos y convertimos las barras '//' en ';' para que sea compatible con el servidor.
         const sqlClean = sqlContent
             .replace(/DELIMITER\s+\/\/+/gi, '')
             .replace(/DELIMITER\s+;+/gi, '')
             .replace(/\/\//g, ';');
 
         await connection.query(sqlClean);
         console.log("✅ Esquema de Bibliotech aplicado correctamente.");
         console.log("✅ Si la base ya existía, sus tablas y datos existentes se conservaron.");
     } catch (error) {
         console.error("❌ Error al configurar la base de datos:");
         console.error(error.message || error.code || error.name);
         if (error.errors) error.errors.forEach(item => console.error(item.code || item.message));
         process.exitCode = 1;
         console.log("\n👉 Intenta importar manualmente el archivo 'backend/config/init.sql' desde phpMyAdmin o MySQL Workbench.");
     } finally {
         if (connection) {
             await connection.end();
         }
     }
 }
 
 run();
