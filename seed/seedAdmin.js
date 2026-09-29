const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";
const ADMIN_NAME = process.env.ADMIN_NAME || "CampusCoin Admin";

const seedAdmin = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      if (existing.role !== "admin") {
        existing.role = "admin";
        await existing.save();
        console.log(`Existing user promoted to admin: ${ADMIN_EMAIL}`);
      } else {
        console.log(`Admin already exists: ${ADMIN_EMAIL}`);
      }
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

      await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
      });

      console.log("Admin created successfully:");
      console.log(`  Email:    ${ADMIN_EMAIL}`);
      console.log(`  Password: ${ADMIN_PASSWORD}`);
    }
  } catch (err) {
    console.error("Error seeding admin:", err.message);
  } finally {
    if (require.main === module) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = { seedAdmin, ADMIN_EMAIL, ADMIN_PASSWORD };
