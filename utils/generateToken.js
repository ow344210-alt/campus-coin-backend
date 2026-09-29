const jwt = require("jsonwebtoken");

const generateToken = (userId, role = "student") => {
  if (!userId) throw new Error("userId is required for token generation");

  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = generateToken;
module.exports.verifyToken = verifyToken;