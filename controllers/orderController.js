const db = require("../config/db");
const { sendSMS } = require("../utils/sms");

// =====================================================
// ➕ CREATE ORDER (SAVE TO PENDING)
// =====================================================
exports.createOrder = async (req, res) => {
  try {
    const {
      customer_id,
      item,
      quantity,
      unit_price,
      paid_amount = 0,

      // ✅ PAYMENT
      payment_method = "cash",
      provider_name = "",
      reference = "",

      notes = "",
      created_by = "staff",
    } = req.body;

    if (!customer_id || !item || !quantity || !unit_price) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const qty = Number(quantity);
    const price = Number(unit_price);
    const paid = Number(paid_amount);

    const total_price = qty * price;

    if (paid > total_price) {
      return res.status(400).json({
        message: "Paid amount cannot exceed total",
      });
    }

    // =========================================
    // ✅ VALIDATE PAYMENT METHOD
    // =========================================
    const allowedMethods = [
      "cash",
      "bank",
      "mobile",
      "card",
    ];

    const safePaymentMethod =
      allowedMethods.includes(payment_method)
        ? payment_method
        : "cash";

    // =========================================
    // SAVE TO PENDING ORDERS
    // =========================================
    const [result] = await db.query(
      `INSERT INTO pending_orders (
        customer_id,
        item,
        quantity,
        unit_price,
        total_price,
        paid_amount,
        payment_method,
        provider_name,
        reference,
        notes,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        item,
        qty,
        price,
        total_price,
        paid,
        safePaymentMethod,
        provider_name,
        reference,
        notes,
        created_by,
      ]
    );

    res.json({
      success: true,
      message: "Order submitted for admin approval",
      pending_order_id: result.insertId,
    });

  } catch (error) {
    console.log("CREATE ORDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =====================================================
// 📥 GET ALL ORDERS
// =====================================================
exports.getOrders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.*,
        c.name AS customer_name,
        c.phone
      FROM orders o
      JOIN customers c
        ON o.customer_id = c.id
      ORDER BY o.created_at DESC
    `);

    res.json(rows);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =====================================================
// 🔄 UPDATE ORDER STATUS
// =====================================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [rows] = await db.query(
      `SELECT 
        o.*,
        c.name,
        c.phone
      FROM orders o
      JOIN customers c
        ON o.customer_id = c.id
      WHERE o.id=?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    await db.query(
      `UPDATE orders
       SET status=?
       WHERE id=?`,
      [status, id]
    );

    // SEND SMS WHEN COMPLETED
    if (status === "Completed") {
      try {
        await sendSMS(
          rows[0].phone,
          `Hello ${rows[0].name}, your order "${rows[0].item}" is completed successfully.`
        );
      } catch (smsError) {
        console.log("SMS ERROR:", smsError);
      }
    }

    res.json({
      success: true,
      message: "Order status updated",
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =====================================================
// 💳 MAKE PAYMENT (SEND TO APPROVAL)
// =====================================================
exports.makePayment = async (req, res) => {
  try {
    const {
      order_id,
      amount,
      method = "cash",

      // ✅ NEW
      provider_name = "",
      reference = "",
      notes = "",
    } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({
        message: "Missing data",
      });
    }

    // =========================================
    // GET ORDER + CUSTOMER
    // =========================================
    const [orderRows] = await db.query(
      `SELECT o.*, c.name, c.phone
       FROM orders o
       JOIN customers c
       ON o.customer_id = c.id
       WHERE o.id = ?`,
      [order_id]
    );

    if (!orderRows.length) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const order = orderRows[0];

    const payAmount = Number(amount);
    const currentPaid = Number(
      order.paid_amount || 0
    );

    const total = Number(
      order.total_price
    );

    const newTotal =
      currentPaid + payAmount;

    if (newTotal > total) {
      return res.status(400).json({
        message:
          "Payment exceeds order balance",
      });
    }

    const balance =
      total - newTotal;

    // =========================================
    // SAFE PAYMENT METHOD
    // =========================================
    const allowedMethods = [
      "cash",
      "bank",
      "mobile",
      "card",
    ];

    const safeMethod =
      allowedMethods.includes(method)
        ? method
        : "cash";

    // =========================================
    // SAVE TO PENDING PAYMENTS
    // =========================================
    await db.query(
      `INSERT INTO pending_payments (
        order_id,
        customer_id,
        amount,
        method,
        provider_name,
        reference,
        notes,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        order_id,
        order.customer_id,
        payAmount,
        safeMethod,
        provider_name,
        reference,
        notes,
      ]
    );

    res.json({
      success: true,
      message:
        "Payment sent for approval",
      pending: true,
      balance,
    });

  } catch (error) {
    console.error(
      "MAKE PAYMENT ERROR:",
      error
    );

    res.status(500).json({
      message: "Server error",
    });
  }
};
// =====================================================
// 💰 UPDATE PAYMENT
// =====================================================
exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      paid_amount,
      method = "cash",

      // ✅ NEW
      provider_name = "",
      reference = "",
      notes = "",
    } = req.body;

    const amount = Number(paid_amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Invalid payment amount",
      });
    }

    const [orders] = await db.query(
      `SELECT
        o.*,
        c.name AS customer_name,
        c.phone
      FROM orders o
      JOIN customers c
        ON o.customer_id = c.id
      WHERE o.id=?`,
      [id]
    );

    if (!orders.length) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const order = orders[0];

    const newPaid =
      Number(order.paid_amount) +
      amount;

    if (
      newPaid >
      Number(order.total_price)
    ) {
      return res.status(400).json({
        message:
          "Overpayment not allowed",
      });
    }

    const status =
      newPaid >=
      Number(order.total_price)
        ? "Completed"
        : newPaid > 0
        ? "Processing"
        : "Pending";

    // =========================================
    // UPDATE ORDER
    // =========================================
    await db.query(
      `UPDATE orders
       SET paid_amount=?, status=?
       WHERE id=?`,
      [newPaid, status, id]
    );

    // =========================================
    // SAVE PAYMENT HISTORY
    // =========================================
    await db.query(
      `INSERT INTO payments (
        order_id,
        customer_id,
        amount,
        method,
        provider_name,
        reference,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        order.customer_id,
        amount,
        method,
        provider_name,
        reference,
        notes,
      ]
    );

    // =========================================
    // SAVE TRANSACTION
    // =========================================
    await db.query(
      `INSERT INTO transactions (
        amount,
        type
      )
      VALUES (?, 'Income')`,
      [amount]
    );

    // =========================================
    // SMS
    // =========================================
    try {
      await sendSMS(
        order.phone,
        `Hello ${order.customer_name}, payment of ${amount} received successfully.`
      );
    } catch (smsError) {
      console.log(
        "SMS ERROR:",
        smsError
      );
    }

    res.json({
      success: true,
      message:
        "Payment updated successfully",
      total_paid: newPaid,
      balance:
        Number(order.total_price) -
        newPaid,
      status,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =====================================================
// 📦 GET PENDING ORDERS
// =====================================================
exports.getPendingOrders = async (
  req,
  res
) => {
  try {
    const [rows] =
      await db.query(`
      SELECT
        po.*,
        c.name AS customer_name,
        c.phone
      FROM pending_orders po
      JOIN customers c
        ON po.customer_id = c.id
      WHERE po.status = 'Pending'
      ORDER BY po.created_at DESC
    `);

    res.json(rows);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =====================================================
// ✅ APPROVE ORDER
// =====================================================
exports.approveOrder = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const [rows] =
      await db.query(
        `SELECT * 
         FROM pending_orders
         WHERE id=?`,
        [id]
      );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message:
          "Pending order not found",
      });
    }

    const order = rows[0];

    // Prevent duplicate processing
    if (
      order.status !== "Pending"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order already processed",
      });
    }

    // =========================================
    // MARK APPROVED
    // =========================================
    await db.query(
      `UPDATE pending_orders
       SET status='Approved'
       WHERE id=?`,
      [id]
    );

    // =========================================
    // MOVE TO ORDERS
    // =========================================
    await db.query(
      `INSERT INTO orders (
        customer_id,
        item,
        quantity,
        unit_price,
        total_price,
        paid_amount,
        payment_method,
        provider_name,
        reference,
        notes,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.customer_id,
        order.item,
        order.quantity,
        order.unit_price,
        order.total_price,
        order.paid_amount,

        // ✅ NEW
        order.payment_method ||
          "cash",

        order.provider_name ||
          "",

        order.reference || "",
        order.notes || "",

        "Pending",
      ]
    );

    res.json({
      success: true,
      message:
        "Order approved successfully",
    });

  } catch (error) {
    console.log(
      "APPROVE ORDER ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =====================================================
// ❌ REJECT ORDER
// =====================================================
exports.rejectOrder = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const [rows] =
      await db.query(
        `SELECT * 
         FROM pending_orders
         WHERE id=?`,
        [id]
      );

    if (!rows.length) {
      return res.status(404).json({
        message:
          "Pending order not found",
      });
    }

    // =========================================
    // MARK REJECTED
    // =========================================
    await db.query(
      `UPDATE pending_orders
       SET status='Rejected'
       WHERE id=?`,
      [id]
    );

    res.json({
      success: true,
      message:
        "Order rejected successfully",
    });

  } catch (error) {
    console.log(
      "REJECT ORDER ERROR:",
      error
    );

    res.status(500).json({
      message: "Server error",
    });
  }
};
// =====================================================
// 🚚 DELIVER ORDER (FIXED)
// =====================================================
exports.deliverOrder = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // =========================================
    // GET ORDER
    // =========================================
    const [rows] =
      await db.query(
        `SELECT 
          o.*, 
          c.name,
          c.phone
         FROM orders o
         JOIN customers c
         ON o.customer_id = c.id
         WHERE o.id=?`,
        [id]
      );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    const order = rows[0];

    if (
      order.status ===
      "Delivered"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order already delivered",
      });
    }
    await recordTransaction({
      customer_id: order.customer_id,
      type: "INCOME",
      source: "ORDER",
      reference_id: order.id,
      amount: paid,
      description: `Delivered order: ${order.item}`
    });
    // =========================================
    // CALCULATIONS
    // =========================================
    const total = Number(
      order.total_price
    );

    const paid = Number(
      order.paid_amount
    );

    const balance =
      total - paid;

    // =========================================
    // UPDATE STATUS
    // =========================================
    await db.query(
      `UPDATE orders
       SET status='Delivered'
       WHERE id=?`,
      [id]
    );

    // =========================================
    // SAVE TRANSACTION
    // =========================================
    await db.query(
      `INSERT INTO transactions (
        customer_id,
        type,
        source,
        reference_id,
        amount,
        description
      )
      VALUES (
        ?,
        'INCOME',
        'ORDER',
        ?,
        ?,
        ?
      )`,
      [
        order.customer_id,
        order.id,
        paid,
        `Delivered order: ${order.item} x${order.quantity} (Paid: ${paid}, Balance: ${balance})`,
      ]
    );

    // =========================================
    // SMS
    // =========================================
    try {
      await sendSMS(
        order.phone,
        `Hello ${order.name}, your order (${order.item}) has been delivered successfully.`
      );
    } catch (smsError) {
      console.log(
        "SMS ERROR:",
        smsError
      );
    }

    res.json({
      success: true,
      message:
        "Order delivered and transaction recorded",
      balance,
    });

  } catch (error) {
    console.log(
      "DELIVER ORDER ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error",
    });
  }
};

// =====================================================
// 📥 GET PENDING PAYMENTS
// =====================================================
exports.getPendingPayments =
  async (req, res) => {
    try {
      const [rows] =
        await db.query(`
        SELECT 
          pp.*,
          c.name AS customer_name,
          c.phone
        FROM pending_payments pp
        JOIN customers c
        ON pp.customer_id = c.id
        WHERE pp.status='Pending'
        ORDER BY pp.created_at DESC
      `);

      res.json(rows);

    } catch (error) {
      console.log(
        "GET PENDING PAYMENTS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  };

// =====================================================
// ✅ APPROVE PAYMENT
// =====================================================



// =====================================================
// 🔥 CENTRAL TRANSACTION WRITER (SAFE)
// =====================================================
const recordTransaction = async ({
  customer_id = null,
  type,
  source,
  reference_id = null,
  amount,
  description = "",
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
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        type,
        source,
        reference_id,
        amount,
        description,
      ]
    );
  } catch (err) {
    console.log("TRANSACTION ERROR:", err);
  }
};

// =====================================================
// 🚚 DELIVER ORDER (FIXED)
// =====================================================
exports.deliverOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT o.*, c.name, c.phone
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id=?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = rows[0];

    if (order.status === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Order already delivered",
      });
    }

    const total = Number(order.total_price || 0);
    const paid = Number(order.paid_amount || 0);
    const balance = total - paid;

    // 1. update order
    await db.query(
      `UPDATE orders SET status='Delivered' WHERE id=?`,
      [id]
    );

    // 2. transaction record
    await recordTransaction({
      customer_id: order.customer_id,
      type: "INCOME",
      source: "ORDER",
      reference_id: order.id,
      amount: total,
      description: `Delivered order: ${order.item} x${order.quantity} (Paid: ${paid}, Balance: ${balance})`,
    });

    // 3. SMS
    try {
      await sendSMS(
        order.phone,
        `Hello ${order.name}, your order (${order.item}) has been delivered successfully.`
      );
    } catch (e) {
      console.log("SMS ERROR:", e);
    }

    res.json({
      success: true,
      message: "Order delivered",
      balance,
    });

  } catch (error) {
    console.log("DELIVER ORDER ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =====================================================
// 💰 APPROVE PAYMENT (FULL FIXED CLEAN VERSION)
// =====================================================
exports.approvePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM pending_payments WHERE id=?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = rows[0];

    if (payment.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
      });
    }

    const [orders] = await db.query(
      `SELECT * FROM orders WHERE id=?`,
      [payment.order_id]
    );

    if (!orders.length) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const order = orders[0];

    const newPaid =
      Number(order.paid_amount || 0) +
      Number(payment.amount || 0);

    const status =
      newPaid >= Number(order.total_price)
        ? "Completed"
        : newPaid > 0
        ? "Processing"
        : "Pending";

    await db.query(
      `UPDATE pending_payments SET status='Approved' WHERE id=?`,
      [id]
    );

    await db.query(
      `UPDATE orders SET paid_amount=?, status=? WHERE id=?`,
      [newPaid, status, payment.order_id]
    );

    await db.query(
      `INSERT INTO payments (
        order_id,
        customer_id,
        amount,
        method,
        provider_name,
        reference,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.order_id,
        payment.customer_id,
        payment.amount,
        payment.method || "cash",
        payment.provider_name || "",
        payment.reference || "",
        payment.notes || "",
      ]
    );

    await db.query(
      `INSERT INTO transactions (amount, type) VALUES (?, 'Income')`,
      [payment.amount]
    );

    res.json({
      success: true,
      message: "Payment approved successfully",
      status,
    });

  } catch (error) {
    console.log("APPROVE PAYMENT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
//// =====================================================
// ❌ REJECT PAYMENT
// =====================================================
exports.rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. CHECK PAYMENT EXISTS
    const [rows] = await db.query(
      `SELECT * FROM pending_payments WHERE id=?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = rows[0];

    // 2. PREVENT DOUBLE PROCESSING
    if (payment.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
      });
    }

    // 3. UPDATE STATUS
    await db.query(
      `UPDATE pending_payments SET status='Rejected' WHERE id=?`,
      [id]
    );

    res.json({
      success: true,
      message: "Payment rejected successfully",
    });

  } catch (error) {
    console.log("REJECT PAYMENT ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};