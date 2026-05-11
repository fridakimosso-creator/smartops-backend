const jwt = require("jsonwebtoken");

// ============================
// CHECK IF USER IS LOGGED IN
// ============================
exports.auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const decoded = jwt.verify(token, "SECRET_KEY");

    req.user = decoded; // { id, role }

    next();

  } catch (error) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
};
exports.requireRole = (...roles) => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }
  
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({ message: "Access denied" });
        }
  
        next();
  
      } catch (error) {
        return res.status(500).json({ message: "Server error" });
      }
    };
  };