const mysql = require("mysql2");
require("dotenv").config();

// 🚀 SUPPORT BOTH LOCAL + RENDER (BEST PRACTICE)
let pool;

if (process.env.DATABASE_URL) {
  // 🔥 PRODUCTION (Render + Aiven)
  pool = mysql.createPool({
    uri: process.env.DATABASE_URL,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // 🧪 LOCAL DEVELOPMENT
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// 🔥 PROMISE SUPPORT (async/await)
const db = pool.promise();

// 🧪 TEST CONNECTION
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ DB CONNECTION FAILED:", err.message);
  } else {
    console.log("✅ DATABASE CONNECTED SUCCESSFULLY");
    connection.release();
  }
});

module.exports = db;