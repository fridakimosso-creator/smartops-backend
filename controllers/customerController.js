const db = require("../config/db");

// =====================================================
// 📥 GET ALL CUSTOMERS
// =====================================================
exports.getCustomers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        name,
        phone,
        gender,
        place,
        email,
        type,
        created_at
      FROM customers
      ORDER BY id DESC
    `);

    res.json(rows);

  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// =====================================================
// 🔍 SEARCH CUSTOMERS (FOR SALES PAGE)
// =====================================================
exports.searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json([]);
    }

    const [rows] = await db.query(`
      SELECT 
        id,
        name,
        phone,
        email,
        type
      FROM customers
      WHERE 
        name LIKE ? 
        OR phone LIKE ?
        OR email LIKE ?
      LIMIT 10
    `, [`%${q}%`, `%${q}%`, `%${q}%`]);

    res.json(rows);

  } catch (error) {
    console.error("SEARCH CUSTOMERS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// =====================================================
// ➕ CREATE CUSTOMER
// =====================================================
exports.createCustomer = async (req, res) => {
  try {
    const {
      name,
      phone,
      gender,
      place,
      email,
      type,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        message: "Name and phone are required",
      });
    }

    // 🔒 CHECK DUPLICATE PHONE
    const [existing] = await db.query(
      "SELECT id FROM customers WHERE phone = ?",
      [phone]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Phone number already exists",
      });
    }

    await db.query(
      `INSERT INTO customers
      (name, phone, gender, place, email, type)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        phone,
        gender || null,
        place || null,
        email || null,
        type || "Regular",
      ]
    );

    res.json({
      success: true,
      message: "Customer created successfully",
    });

  } catch (error) {
    console.error("CREATE CUSTOMER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// =====================================================
// ✏️ UPDATE CUSTOMER
// =====================================================
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      phone,
      gender,
      place,
      email,
      type,
    } = req.body;

    await db.query(
      `UPDATE customers
       SET name=?, phone=?, gender=?, place=?, email=?, type=?
       WHERE id=?`,
      [
        name,
        phone,
        gender,
        place,
        email,
        type,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Customer updated successfully",
    });

  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// =====================================================
// ❌ DELETE CUSTOMER
// =====================================================
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      "DELETE FROM customers WHERE id=?",
      [id]
    );

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });

  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};