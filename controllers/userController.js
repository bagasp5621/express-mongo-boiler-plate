const jwt = require("jsonwebtoken");
const validator = require("email-validator");

const User = require("../models/userModel");

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

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

    // check password match
    if (password !== confirmPassword) {
      throw { statusCode: 400, message: "Password do not match" };
    }

    // create user
    const user = await User.create({ name, email, password });

    // generate token and cookie
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days in milliseconds
    });

    res.status(201).json({
      message: "Account Created",
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

    // email validation
    if (!validator.validate(email)) {
      throw { statusCode: 422, message: "Invalid email address" };
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw { statusCode: 401, message: "Incorrect email or password" };
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
    console.log(userId);

    const user = await User.findById(userId);

    if (!user) {
      throw { statusCode: 404, message: "User not found" };
    }

    if (name) {
      if (user.name === name) {
        throw {
          statusCode: 404,
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
          statusCode: 404,
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
    if (
      !req.body.oldPassword ||
      !req.body.newPassword ||
      !req.body.confirmPassword
    ) {
      throw { statusCode: 400, message: "Missing required fields" };
    }

    const { oldPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw { statusCode: 404, message: "User not found" };
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      throw { statusCode: 401, message: "Old password is incorrect" };
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
