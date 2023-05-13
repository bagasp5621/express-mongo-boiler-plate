const errorHandler = (err, req, res, next) => {
  // Check if the error is a custom error with a specific status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // If it's not a custom error, return a 500 Internal Server Error with a generic message
  console.error(err);

  if (process.env.NODE_ENV === "development") {
    return res.status(500).json({ error: err.message, stack: err.stack });
  } else {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = errorHandler;
