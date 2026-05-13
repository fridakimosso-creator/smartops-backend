const mysql = require("mysql2");
require("dotenv").config();

let pool;

// 🚀 PRODUCTION (Render + Aiven)
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);

  pool = mysql.createPool({
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.replace("/", ""),
    port: url.port || 3306,

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

// 🔥 PROMISE SUPPORT
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