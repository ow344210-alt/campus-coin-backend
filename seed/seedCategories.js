const mongoose = require("mongoose");
require("dotenv").config();

const Category = require("../models/Category");

const DEFAULT_CATEGORIES = [
  { name: "Allowance", type: "income", isDefault: true, icon: "wallet", color: "#22c55e" },
  { name: "Part-time Job", type: "income", isDefault: true, icon: "briefcase", color: "#10b981" },
  { name: "Scholarship", type: "income", isDefault: true, icon: "academic-cap", color: "#06b6d4" },
  { name: "Gift", type: "income", isDefault: true, icon: "gift", color: "#ec4899" },
  { name: "Freelance/Gig Work", type: "income", isDefault: true, icon: "laptop", color: "#8b5cf6" },
  { name: "Other Income", type: "income", isDefault: true, icon: "cash", color: "#64748b" },

  { name: "Food", type: "expense", isDefault: true, icon: "utensils", color: "#ef4444" },
  { name: "Groceries", type: "expense", isDefault: true, icon: "shopping-cart", color: "#f97316" },
  { name: "Transport", type: "expense", isDefault: true, icon: "bus", color: "#eab308" },
  { name: "Hostel/Rent", type: "expense", isDefault: true, icon: "home", color: "#84cc16" },
  { name: "Academics", type: "expense", isDefault: true, icon: "book-open", color: "#06b6d4" },
  { name: "Subscriptions", type: "expense", isDefault: true, icon: "credit-card", color: "#3b82f6" },
  { name: "Entertainment", type: "expense", isDefault: true, icon: "film", color: "#a855f7" },
  { name: "Mobile/Internet", type: "expense", isDefault: true, icon: "phone", color: "#6366f1" },
  { name: "Health/Medical", type: "expense", isDefault: true, icon: "heart", color: "#f43f5e" },
  { name: "Clothing", type: "expense", isDefault: true, icon: "shopping-bag", color: "#d946ef" },
  { name: "Sports/Fitness", type: "expense", isDefault: true, icon: "dumbbell", color: "#14b8a6" },
  { name: "Travel/Trips", type: "expense", isDefault: true, icon: "globe", color: "#0284c7" },
  { name: "Electronics/Gadgets", type: "expense", isDefault: true, icon: "desktop", color: "#475569" },
  { name: "Miscellaneous", type: "expense", isDefault: true, icon: "dots-horizontal", color: "#94a3b8" },
];

const seedCategories = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const operations = DEFAULT_CATEGORIES.map((cat) => ({
      updateOne: {
        filter: { name: cat.name, type: cat.type },
        update: { $setOnInsert: cat },
        upsert: true,
      },
    }));

    const result = await Category.bulkWrite(operations);

    console.log(`Seeding complete. Upserted: ${result.upsertedCount || 0}`);
  } catch (err) {
    console.error("Error seeding categories:", err.message);
  } finally {
    if (require.main === module) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  seedCategories();
}

module.exports = { seedCategories, DEFAULT_CATEGORIES };