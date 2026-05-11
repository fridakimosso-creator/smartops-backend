const db = require("../config/db");

exports.getDashboardData = async (req, res) => {
  try {

    // =========================================
    // TOTAL CUSTOMERS
    // =========================================
    const [customers] = await db.query(`
      SELECT COUNT(*) AS totalCustomers
      FROM customers
    `);

    // =========================================
    // TOTAL ORDERS
    // =========================================
    const [orders] = await db.query(`
      SELECT COUNT(*) AS totalOrders
      FROM orders
    `);

    // =========================================
    // PENDING ORDERS
    // =========================================
    const [pending] = await db.query(`
      SELECT COUNT(*) AS pendingOrders
      FROM orders
      WHERE status = 'pending'
    `);

    // =========================================
    // TOTAL REVENUE
    // =========================================
    const [revenue] = await db.query(`
      SELECT SUM(total_price) AS totalRevenue
      FROM sales
    `);

    // =========================================
    // RECENT ORDERS
    // =========================================
    const [recentOrders] = await db.query(`
    SELECT
      id,
      item AS product,
      quantity,
      total_price,
      status,
      created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 5
  `);
    // =========================================
    // MONTHLY REVENUE
    // =========================================
    const [monthlyRevenue] = await db.query(`
      SELECT
        MONTH(created_at) AS monthNumber,
        MONTHNAME(created_at) AS month,
        SUM(total_price) AS revenue
      FROM sales
      GROUP BY
        MONTH(created_at),
        MONTHNAME(created_at)
      ORDER BY monthNumber ASC
    `);

    // =========================================
    // WEEKLY ORDERS
    // =========================================
    const [weeklyOrders] = await db.query(`
      SELECT
        DAYOFWEEK(created_at) AS dayNumber,
        DAYNAME(created_at) AS name,
        COUNT(*) AS orders
      FROM orders
      GROUP BY
        DAYOFWEEK(created_at),
        DAYNAME(created_at)
      ORDER BY dayNumber ASC
    `);

    // =========================================
    // RESPONSE
    // =========================================
    res.json({
      success: true,

      stats: {
        totalCustomers: customers[0]?.totalCustomers || 0,
        totalOrders: orders[0]?.totalOrders || 0,
        pendingOrders: pending[0]?.pendingOrders || 0,
        totalRevenue: revenue[0]?.totalRevenue || 0,
      },

      revenueData: monthlyRevenue || [],

      orderData: weeklyOrders || [],

      recentOrders: recentOrders || [],
    });

  } catch (error) {

    console.log("DASHBOARD ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Dashboard server error",
      error: error.message,
    });
  }
};