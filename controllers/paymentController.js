
// 💰 MAKE PAYMENT (MODERN)
// ==========================
const db = require("../config/db");
const { sendSMS } = require("../utils/sms");

// ==========================
// 💰 MAKE PAYMENT (SEND TO APPROVAL)
// ==========================
exports.makePayment = async (req, res) => {
  try {
    const { order_id, amount, method } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ message: "Missing data" });
    }

    // 1. Get order + customer
    const [orderRows] = await db.query(
      `SELECT o.*, c.name, c.phone
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [order_id]
    );

    if (!orderRows.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderRows[0];

    const payAmount = Number(amount);
    const currentPaid = Number(order.paid_amount || 0);
    const total = Number(order.total_price);

    const newTotal = currentPaid + payAmount;

    if (newTotal > total) {
      return res.status(400).json({
        message: "Payment exceeds order balance",
      });
    }

    const balance = total - newTotal;

    // =========================================
    // 🚨 CHANGE: SAVE TO PENDING PAYMENTS ONLY
    // =========================================
    await db.query(
      `INSERT INTO pending_payments (
        order_id,
        customer_id,
        amount,
        method,
        status
      ) VALUES (?, ?, ?, ?, 'Pending')`,
      [
        order_id,
        order.customer_id,
        payAmount,
        method || "cash",
      ]
    );

    // ❌ DO NOT update orders yet
    // ❌ DO NOT insert into payments yet

    // =========================================
    // 📢 RESPONSE (GOES TO ADMIN APPROVAL PAGE)
    // =========================================
    res.json({
      success: true,
      message: "Payment sent for approval",
      pending: true,
      balance,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
exports.approvePayment = async (req, res) => {
  const { id } = req.params;

  const [rows] = await db.query(
    "SELECT * FROM pending_payments WHERE id = ?",
    [id]
  );

  const payment = rows[0];

  await db.query(
    `UPDATE orders 
     SET paid_amount = paid_amount + ?
     WHERE id = ?`,
    [payment.amount, payment.order_id]
  );

  await db.query(
    `UPDATE pending_payments SET status = 'Approved' WHERE id = ?`,
    [id]
  );

  res.json({ message: "Payment approved" });
};
exports.approvePayment = async (req, res) => {
  const { id } = req.params;

  const [rows] = await db.query(
    "SELECT * FROM pending_payments WHERE id = ?",
    [id]
  );

  const payment = rows[0];

  await db.query(
    `UPDATE orders 
     SET paid_amount = paid_amount + ?
     WHERE id = ?`,
    [payment.amount, payment.order_id]
  );

  await db.query(
    `UPDATE pending_payments SET status = 'Approved' WHERE id = ?`,
    [id]
  );

  res.json({ message: "Payment approved" });
};