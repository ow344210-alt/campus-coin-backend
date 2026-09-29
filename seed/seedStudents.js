const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");
const Category = require("../models/Category");
const Transaction = require("../models/Transaction");

const STUDENT_PASSWORD = process.env.STUDENT_SEED_PASSWORD || "Student@123";

const STUDENTS = [
  { name: "Ahmed Raza", email: "ahmed.raza@gmail.com", academicYear: "2nd Year" },
  { name: "Fatima Noor", email: "fatima.noor@gmail.com", academicYear: "1st Year" },
  { name: "Bilal Khan", email: "bilal.khan@gmail.com", academicYear: "3rd Year" },
  { name: "Ayesha Siddiqui", email: "ayesha.siddiqui@gmail.com", academicYear: "4th Year" },
  { name: "Hamza Sheikh", email: "hamza.sheikh@gmail.com", academicYear: "2nd Year" },
  { name: "Zainab Malik", email: "zainab.malik@gmail.com", academicYear: "1st Year" },
  { name: "Usman Tariq", email: "usman.tariq@gmail.com", academicYear: "3rd Year" },
  { name: "Mahnoor Iqbal", email: "mahnoor.iqbal@gmail.com", academicYear: "2nd Year" },
  { name: "Saad Anwar", email: "saad.anwar@gmail.com", academicYear: "4th Year" },
  { name: "Hira Yousuf", email: "hira.yousuf@gmail.com", academicYear: "1st Year" },
  { name: "Danish Ali", email: "danish.ali@gmail.com", academicYear: "3rd Year" },
  { name: "Sana Riaz", email: "sana.riaz@gmail.com", academicYear: "2nd Year" },
  { name: "Talha Hassan", email: "talha.hassan@gmail.com", academicYear: "1st Year" },
  { name: "Areeba Sultan", email: "areeba.sultan@gmail.com", academicYear: "4th Year" },
  { name: "Faizan Ahmed", email: "faizan.ahmed@gmail.com", academicYear: "3rd Year" },
];

const EXPENSE_CATEGORY_RANGES = {
  Food: [500, 4000],
  Groceries: [1000, 6000],
  Transport: [300, 2500],
  "Hostel/Rent": [8000, 25000],
  Academics: [500, 8000],
  Subscriptions: [200, 1500],
  Entertainment: [300, 3000],
  "Mobile/Internet": [500, 2000],
  "Health/Medical": [300, 5000],
  Clothing: [500, 4000],
};

const INCOME_CATEGORY_RANGES = {
  Allowance: [10000, 30000],
  "Part-time Job": [5000, 15000],
  Scholarship: [10000, 40000],
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomDateWithinLastMonths = (months) => {
  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - months);
  const ts = randomInt(past.getTime(), now.getTime());
  return new Date(ts);
};

const seedStudents = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(STUDENT_PASSWORD, salt);

    const expenseCategories = await Category.find({
      type: "expense",
      user: null,
      name: { $in: Object.keys(EXPENSE_CATEGORY_RANGES) },
    });

    const incomeCategories = await Category.find({
      type: "income",
      user: null,
      name: { $in: Object.keys(INCOME_CATEGORY_RANGES) },
    });

    if (expenseCategories.length === 0 || incomeCategories.length === 0) {
      console.log("Run npm run seed first to create default categories.");
      return;
    }

    let createdCount = 0;
    const createdStudents = [];

    for (const student of STUDENTS) {
      let user = await User.findOne({ email: student.email });

      if (!user) {
        user = await User.create({
          name: student.name,
          email: student.email,
          password: hashedPassword,
          role: "student",
          academicYear: student.academicYear,
          monthlyAllowanceBaseline: randomInt(15000, 30000),
          monthlySavingsGoal: randomInt(2000, 8000),
        });
        createdCount += 1;
      }

      createdStudents.push(user);

      const existingTxCount = await Transaction.countDocuments({ user: user._id });
      if (existingTxCount > 0) continue;

      const transactions = [];

      const incomeCount = randomInt(2, 3);
      for (let i = 0; i < incomeCount; i++) {
        const category = incomeCategories[randomInt(0, incomeCategories.length - 1)];
        const [min, max] = INCOME_CATEGORY_RANGES[category.name];
        transactions.push({
          user: user._id,
          category: category._id,
          type: "income",
          amount: randomInt(min, max),
          description: `${category.name} received`,
          date: randomDateWithinLastMonths(3),
          source: "manual",
        });
      }

      const expenseCount = randomInt(12, 20);
      for (let i = 0; i < expenseCount; i++) {
        const category = expenseCategories[randomInt(0, expenseCategories.length - 1)];
        const [min, max] = EXPENSE_CATEGORY_RANGES[category.name];
        transactions.push({
          user: user._id,
          category: category._id,
          type: "expense",
          amount: randomInt(min, max),
          description: `${category.name} expense`,
          date: randomDateWithinLastMonths(3),
          source: "manual",
        });
      }

      await Transaction.insertMany(transactions);
    }

    console.log(`Students created: ${createdCount}`);
    console.log(`Total students available: ${createdStudents.length}`);
    console.log(`Shared password for all seeded students: ${STUDENT_PASSWORD}`);
    createdStudents.forEach((s) => console.log(`  ${s.email}`));
  } catch (err) {
    console.error("Error seeding students:", err.message);
  } finally {
    if (require.main === module) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  seedStudents();
}

module.exports = { seedStudents, STUDENTS, STUDENT_PASSWORD };
