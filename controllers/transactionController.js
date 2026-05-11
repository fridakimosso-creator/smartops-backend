const db = require("../config/db");

// =====================================================
// ➕ CREATE TRANSACTION (MANUAL)
// =====================================================
exports.createTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      description,
      reference_id,
      source,
      customer_id = null
    } = req.body;

    if (!type || !amount) {
      return res.status(400).json({
        message: "type and amount required"
      });
    }

    await db.query(
      `INSERT INTO transactions 
      (customer_id, type, amount, description, reference_id, source)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        type,
        Number(amount),
        description || null,
        reference_id || null,
        source || "MANUAL"
      ]
    );

    res.json({
      success: true,
      message: "Transaction saved"
    });

  } catch (err) {
    console.error("CREATE TRANSACTION ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// =====================================================
// 📥 GET TRANSACTIONS (FULL LEDGER)
// =====================================================
exports.getTransactions = async (req, res) => {
  try {
    const { range } = req.query;

    let where = "";

    if (range === "day") {
      where = "WHERE DATE(created_at) = CURDATE()";
    } else if (range === "month") {
      where = "WHERE MONTH(created_at) = MONTH(CURDATE())";
    } else if (range === "year") {
      where = "WHERE YEAR(created_at) = YEAR(CURDATE())";
    }

    const [rows] = await db.query(`
      SELECT *
      FROM transactions
      ${where}
      ORDER BY created_at DESC
    `);

    res.json(rows);

  } catch (err) {
    console.log("GET TRANSACTIONS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// =====================================================
// 📊 SUMMARY
// =====================================================
exports.getSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        SUM(CASE WHEN type='INCOME' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END) AS expense
      FROM transactions
    `);

    const income = rows[0].income || 0;
    const expense = rows[0].expense || 0;

    res.json({
      income,
      expense,
      balance: income - expense
    });

  } catch (err) {
    console.error("SUMMARY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// =====================================================
// 📅 RANGE FILTER (OPTIONAL API)
// =====================================================
exports.getByRange = async (req, res) => {
  try {
    const { range } = req.query;

    let query = `
      SELECT 
        t.*,
        c.name AS customer_name,
        c.phone
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
    `;

    if (range === "day") {
      query += ` WHERE DATE(t.created_at) = CURDATE()`;
    } else if (range === "month") {
      query += ` WHERE MONTH(t.created_at) = MONTH(CURDATE())`;
    } else if (range === "year") {
      query += ` WHERE YEAR(t.created_at) = YEAR(CURDATE())`;
    }

    query += ` ORDER BY t.created_at DESC`;

    const [rows] = await db.query(query);

    res.json(rows);

  } catch (err) {
    console.error("RANGE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// =====================================================
// 🔥 CENTRAL LEDGER FUNCTION (REUSABLE)
// =====================================================
const recordTransaction = async ({
  customer_id = null,
  type,
  source,
  reference_id = null,
  amount,
  description = ""
}) => {
  try {
    await db.query(
      `INSERT INTO transactions (
        customer_id,
        type,
        source,
        reference_id,
        amount,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        type,
        source,
        reference_id,
        amount,
        description
      ]
    );
  } catch (err) {
    console.log("LEDGER ERROR:", err);
  }
};
exports.getFullReport = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.*,
        c.name AS customer_name,
        c.phone
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      ORDER BY t.created_at DESC
    `);

    res.json(rows);

  } catch (err) {
    console.error("FULL REPORT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// export helper properly
module.exports.recordTransaction = recordTransaction;