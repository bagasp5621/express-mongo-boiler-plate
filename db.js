const mongoose = require("mongoose");
require("dotenv").config();

const dbURI = process.env.DATABASE;

mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Database connected"))
  .catch((err) => console.log(err));

const db = mongoose.connection;

module.exports = db;
