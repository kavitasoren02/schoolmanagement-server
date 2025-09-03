const mysql = require('mysql2/promise');

// MySQL connection configuration
const dbConfig = {
    host: 'bxwaufzkfdcwp4uerr8s-mysql.services.clever-cloud.com',
    user: 'ufj6jrf6ilke5cho',
    password: 'UWj1bClnQHcPXIlpBHp0',
    database: 'bxwaufzkfdcwp4uerr8s',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

module.exports = {pool, dbConfig};