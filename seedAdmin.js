const bcrypt = require("bcrypt");
const db = require("./config/db");

async function createAdmin() {
  try {
    const name = "System Admin";
    const email = "admin@system.com";
    const password = "123456";

    // 1. check if exists
    const [existing] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      console.log("Admin already exists");
      process.exit();
    }

    // 2. hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. insert user
    await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, "admin"]
    );

    console.log("✅ Admin created successfully");
    console.log("Email: admin@system.com");
    console.log("Password: 123456");

  } catch (err) {
    console.log("❌ Error:", err);
  }

  process.exit();
}

createAdmin();