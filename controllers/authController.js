const jwt = require("jsonwebtoken");

const User = require("../models/userModel");

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

exports.emailVerification = async (req, res, next) => {
  const { token } = req.params;

  try {
    // Find the user by the verification token
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    // Update user's status to verified
    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    return res.status(200).json({ message: "Email verification successful" });
  } catch (err) {
    next(err);
  }
};
