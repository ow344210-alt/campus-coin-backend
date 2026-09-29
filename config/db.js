const mongoose = require("mongoose");

// Cached on `global` so a warm serverless container reuses the same connection
// instead of opening a new one on every cold module evaluation.
const CACHE_KEY = "__campuscoinMongoConnection";

const connectDB = () => {
  // Already connected (warm invocation) - reuse it.
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }

  // A connection attempt is already in flight - join it instead of duplicating.
  if (global[CACHE_KEY]) {
    return global[CACHE_KEY];
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    return Promise.reject(
      new Error("MONGO_URI is not defined in environment variables")
    );
  }

  global[CACHE_KEY] = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    })
    .then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn.connection;
    })
    .catch((err) => {
      // Allow a later invocation/request to retry instead of caching the failure.
      delete global[CACHE_KEY];
      throw err;
    });

  return global[CACHE_KEY];
};

module.exports = connectDB;
