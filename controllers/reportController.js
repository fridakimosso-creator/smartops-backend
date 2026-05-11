const db = require("../config/db");

// ==========================
// 📊 DASHBOARD SUMMARY
// ==========================
exports.getDashboardSummary = async (req, res) => {
  try {
    // SALES TOTAL
    const [sales] = await db.query(`
      SELECT SUM(total_price) AS total_sales
      FROM sales
    `);

    // ORDERS TOTAL
    const [orders] = await db.query(`
      SELECT SUM(total_price) AS total_orders
      FROM orders
    `);

    // TRANSACTIONS SUMMARY
    const [tx] = await db.query(`
      SELECT 
        SUM(CASE WHEN type='INCOME' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type='EXPENSE' THEN amount ELSE 0 END) AS expense
      FROM transactions
    `);

    const income = tx[0].income || 0;
    const expense = tx[0].expense || 0;

    res.json({
      total_sales: sales[0].total_sales || 0,
      total_orders: orders[0].total_orders || 0,
      total_income: income,
      total_expense: expense,
      balance: income - expense
    });

  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==========================
// 📈 DAILY REVENUE (SALES)
// ==========================
exports.getDailySales = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        DATE(created_at) AS date,
        SUM(total_price) AS revenue
      FROM sales
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json(rows);

  } catch (error) {
    console.error("DAILY SALES ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==========================
// 📈 DAILY ORDERS VALUE
// ==========================
exports.getDailyOrders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        DATE(created_at) AS date,
        SUM(total_price) AS revenue
      FROM orders
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json(rows);

  } catch (error) {
    console.error("DAILY ORDERS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==========================
// 📊 TOP CUSTOMERS (BY ORDERS)
// ==========================
exports.getTopCustomers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.name,
        c.phone,
        SUM(o.total_price) AS total_spent
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 5
    `);

    res.json(rows);

  } catch (error) {
    console.error("TOP CUSTOMERS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};