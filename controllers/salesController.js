const db = require("../config/db");

// ==========================
// ➕ CREATE SALE (PENDING ONLY)
// ==========================
exports.createSale = async (req, res) => {
  try {
    const {
      customer_id,
      customer_phone,
      product,
      quantity,
      unit_price,
      payment_method = "cash",
    } = req.body;

    if (!product || !quantity || !unit_price) {
      return res.status(400).json({
        message: "Product, quantity and price are required",
      });
    }

    const qty = Number(quantity);
    const price = Number(unit_price);

    if (isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
      return res.status(400).json({
        message: "Invalid quantity or price",
      });
    }

    const total_price = qty * price;

    const allowedMethods = ["cash", "bank", "mobile", "card"];
    const safePaymentMethod = allowedMethods.includes(payment_method)
      ? payment_method
      : "cash";

    await db.query(
      `INSERT INTO pending_sales 
      (customer_id, customer_phone, product, quantity, unit_price, total_price, payment_method, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        customer_id || null,
        customer_phone || null,
        product,
        qty,
        price,
        total_price,
        safePaymentMethod,
      ]
    );

    res.json({
      success: true,
      message: "Sale sent for approval",
    });

  } catch (error) {
    console.log("CREATE SALE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// 📥 GET ALL SALES
// ==========================
exports.getSales = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM sales
      ORDER BY created_at DESC
    `);

    res.json(rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// 📦 GET PENDING SALES
// ==========================
exports.getPendingSales = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ps.*, c.name AS customer_name
      FROM pending_sales ps
      LEFT JOIN customers c ON ps.customer_id = c.id
      WHERE ps.status = 'Pending'
      ORDER BY ps.created_at DESC
    `);

    res.json(rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// ✅ APPROVE SALE (FIXED)
// ==========================
exports.approveSale = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM pending_sales WHERE id=?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Sale not found",
      });
    }

    const sale = rows[0];

    if (sale.status !== "Pending") {
      return res.status(400).json({
        message: "Sale already processed",
      });
    }

    const total = Number(sale.total_price);

    // 1. mark approved
    await db.query(
      "UPDATE pending_sales SET status='Approved' WHERE id=?",
      [id]
    );

    // 2. insert into sales (FINAL)
    const [result] = await db.query(
      `INSERT INTO sales 
      (customer_id, customer_phone, product, quantity, unit_price, total_price, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sale.customer_id,
        sale.customer_phone,
        sale.product,
        sale.quantity,
        sale.unit_price,
        sale.total_price,
        sale.payment_method || "cash",
      ]
    );

    const saleId = result.insertId;

    // 3. transaction record (FIXED ORDER)
    await db.query(
      `INSERT INTO transactions 
      (customer_id, type, source, reference_id, amount, description)
      VALUES (?, 'INCOME', 'SALE', ?, ?, ?)`,
      [
        sale.customer_id,
        saleId,
        total,
        `Sale approved: ${sale.product}`,
      ]
    );

    res.json({
      success: true,
      message: "Sale approved successfully",
    });

  } catch (error) {
    console.log("APPROVE SALE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// ❌ REJECT SALE
// ==========================
exports.rejectSale = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      "UPDATE pending_sales SET status='Rejected' WHERE id=?",
      [id]
    );

    res.json({
      success: true,
      message: "Sale rejected",
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};


// ==========================
// 📊 DAILY REVENUE
// ==========================
exports.getDailyRevenue = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        DATE(created_at) AS date,
        SUM(total_price) AS revenue,
        COUNT(*) AS total_sales
      FROM sales
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json(rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};