const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

const db = require("./db");

const errorHandler = require("./utils/errorHandler");

const indexRouter = require("./routes/indexRouter");
const usersRouter = require("./routes/userRouter");

// API Rate limit
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max:
    process.env.NODE_ENV === "development"
      ? process.env.RATE_LIMIT_DEV
      : process.env.RATE_LIMIT_PROD,
  message: "Too many requests from this IP, please try again in a few minutes",
});

const app = express();

app.use(helmet());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(limiter);

app.use("/", indexRouter);
app.use("/users", usersRouter);

app.use(errorHandler);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // send JSON response for errors
  if (req.app.get("env") === "development") {
    res.status(err.status || 500).json({
      message: err.message,
      error: err,
    });
  } else {
    res.status(err.status || 500).json({
      message: "404 Not Found",
    });
  }
});

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", function () {
  console.log("MongoDB database connection established successfully");
});

module.exports = app;
