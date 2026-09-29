const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

const isProduction = process.env.NODE_ENV === "production";

const LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/+$/, "");

const parseOriginList = (value) =>
  String(value || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

const allowedOrigins = parseOriginList(process.env.FRONTEND_URL || process.env.CLIENT_URL);

if (isProduction && allowedOrigins.length === 0) {
  console.warn(
    "[cors] FRONTEND_URL is not set. Requests from browsers will be allowed from any origin."
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header: curl, health checks, server-to-server calls, same-origin.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(normalizeOrigin(origin))) return callback(null, true);

      if (!isProduction && LOCAL_ORIGINS.includes(normalizeOrigin(origin))) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "CampusCoin API server running" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/budgets", require("./routes/budgetRoutes"));
app.use("/api/insights", require("./routes/insightRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error(`[error] ${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`);
  }

  // Client (4xx) messages are part of the existing API contract and are preserved.
  // Server (5xx) messages are masked in production to avoid leaking internal details.
  const message =
    isServerError && isProduction ? "Internal Server Error" : err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Warm the database connection. Mongoose buffers queries issued while connecting,
// so requests arriving during a cold start are served once the connection opens.
// Never called process.exit(): a failed connection must not kill a serverless invocation.
connectDB().catch((err) => {
  console.error(`[db] initial connection failed: ${err.message}`);
});

module.exports = app;
