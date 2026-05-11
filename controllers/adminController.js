const db = require("../config/db");
const bcrypt = require("bcrypt");

// ============================
// GET ALL USERS
// ============================
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, role, created_at FROM users"
    );

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ============================
// CREATE USER (ADMIN ONLY)
// ============================
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const [existing] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role || "user"]
    );

    res.json({ message: "User created successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ============================
// UPDATE USER ROLE
// ============================
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    await db.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [role, id]
    );

    res.json({ message: "Role updated successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ============================
// DELETE USER
// ============================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      "DELETE FROM users WHERE id = ?",
      [id]
    );

    res.json({ message: "User deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};