const mysql = require("mysql2");
require("dotenv").config();

// 🚀 CREATE POOL (MODERN APPROACH)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),


  // 🔥 IMPORTANT PERFORMANCE SETTINGS
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promisify for async/await usage (VERY IMPORTANT)
const db = pool.promise();

module.exports = db;