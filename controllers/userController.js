const jwt = require("jsonwebtoken");
const validator = require("email-validator");
const randomstring = require("randomstring");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const User = require("../models/userModel");

var transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: process.env.NODEMAILER_PORT,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if ((!name, !email, !password, !confirmPassword)) {
      throw { statusCode: 400, message: "Please provide all required fields" };
    }

    // duplicate email
    const emailExist = await User.findOne({ email });
    if (emailExist) {
      throw {
        statusCode: 409,
        message: "This email is already registered or unavailable",
      };
    }

    // email validation
    if (!validator.validate(email)) {
      throw { statusCode: 422, message: "Invalid email address" };
    }

    // password validation
    if (password.length < 8) {
      throw {
        statusCode: 400,
        message: "Password must be at least 8 characters long",
      };
    }

    // check password match
    if (password !== confirmPassword) {
      throw { statusCode: 400, message: "Password do not match" };
    }

    // create token for email verification
    const verificationToken = randomstring.generate(64) + Date.now().toString();

    const verificationLink = `http://localhost:3000/v1/users/verify/${verificationToken}`;

    const filePath = path.join(
      __dirname,
      "..",
      "views",
      "verification",
      "verification.html"
    );

    const template = fs.readFileSync(filePath, "utf8");

    const html = template.replaceAll(
      "{{ verificationLink }}",
      verificationLink
    );

    // Send verification email
    const mailOptions = {
      from: "noreply@example.com",
      to: email,
      subject: "Account Verification",
      html: html,
    };

    await transporter.sendMail(mailOptions);

    // create user
    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
    });

    // generate token and cookie
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days in milliseconds
    });

    res.status(201).json({
      message:
        "Account Created, Please verify your account by checking your email.",
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if ((!email, !password)) {
      throw { statusCode: 400, message: "Please provide all required fields" };
    }

    // email validation
    if (!validator.validate(email)) {
      throw { statusCode: 422, message: "Invalid email address" };
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw { statusCode: 401, message: "Incorrect email or password" };
    }

    if (!user.verified) {
      throw { statusCode: 401, message: "Email not verified" };
    }

    const passwordIsMatch = await user.comparePassword(password);
    if (!passwordIsMatch) {
      throw { statusCode: 401, message: "Incorrect email or password" };
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days in milliseconds
    });

    return res.status(200).json({
      message: "Login success",
      user: { userId: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      throw { statusCode: 404, message: "User not found" };
    }
    return res
      .status(200)
      .json({ userId: user._id, name: user.name, email: user.email });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.userId;

    if (!name && !email) {
      throw { statusCode: 400, message: "Please provide all required fields" };
    }

    const user = await User.findById(userId);

    if (!user) {
      throw { statusCode: 404, message: "User not found" };
    }

    if (name) {
      if (user.name === name) {
        throw {
          statusCode: 400,
          message: "The new name cannot be the same as the old name",
        };
      }
      user.name = name;
    }

    if (email) {
      // email validation
      if (!validator.validate(email)) {
        throw { statusCode: 422, message: "Invalid email address" };
      }

      if (user.email === email) {
        throw {
          statusCode: 400,
          message: "The new email cannot be the same as the old email",
        };
      }

      user.email = email;
    }

    await user.save();

    res.status(200).json({
      message: "User updated successfully",
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserPassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if ((!oldPassword, !newPassword, !confirmPassword)) {
      throw { statusCode: 400, message: "Please provide all required fields" };
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      throw { statusCode: 404, message: "User not found" };
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      throw { statusCode: 401, message: "Incorrect password" };
    }

    // password validation
    if (newPassword.length < 8) {
      throw {
        statusCode: 400,
        message: "Password must be at least 8 characters long",
      };
    }

    if (newPassword === oldPassword) {
      throw {
        statusCode: 400,
        message: "The New password cannot be the same as the old password",
      };
    }

    if (newPassword !== confirmPassword) {
      throw {
        statusCode: 400,
        message: "The New password and the confirm password do not match",
      };
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.user.userId);
    if (!user) {
      throw { statusCode: 404, message: "User not found" };
    }

    res.clearCookie("jwt");
    return res.status(200).json({ message: "Account successfully deleted" });
  } catch (err) {
    next(err);
  }
};
