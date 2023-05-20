const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

// router.get("/test", userController.test);

router.post("/create", userController.createUser);

router.get("/login", userController.loginUser);

router.patch("/update", authController.isLogin, userController.updateUser);

router.patch(
  "/update-password",
  authController.isLogin,
  userController.updateUserPassword
);

router.get("/profile", authController.isLogin, userController.getUserById);

router.delete("/delete", authController.isLogin, userController.deleteUser);

router.get("/verify/:token", authController.emailVerification);

router.get("/logout", (req, res) => {
  res.clearCookie("jwt");
});

module.exports = router;
