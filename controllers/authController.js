const jwt = require("jsonwebtoken");

exports.isLogin = (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      throw { statusCode: 401, message: "Invalid token" };
    } else if (err.name === "TokenExpiredError") {
      throw { statusCode: 401, message: "Token expired" };
    } else {
      throw { statusCode: 401, message: "Unauthorized" };
    }
  }
};
