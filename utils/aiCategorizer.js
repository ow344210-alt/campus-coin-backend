const Category = require('../models/Category');

const KEYWORD_MAP = {
  Food: ["cafe", "canteen", "restaurant", "food", "swiggy", "zomato", "lunch", "dinner", "snack", "coffee", "tea", "foodpanda"],
  Transport: ["uber", "careem", "bus", "fuel", "petrol", "rickshaw", "taxi", "fare", "metro", "indrive"],
  "Hostel/Rent": ["rent", "hostel", "dorm", "mess fee", "room"],
  Academics: ["book", "tuition", "stationery", "course", "exam fee", "library", "printout"],
  Subscriptions: ["netflix", "spotify", "prime", "subscription", "youtube premium", "app store"],
  Entertainment: ["movie", "cinema", "game", "outing", "concert", "party"],
  Allowance: ["allowance", "pocket money", "from home"],
  "Part-time Job": ["salary", "freelance", "part-time", "gig", "stipend"],
  Scholarship: ["scholarship", "grant", "fellowship"],
  Gift: ["gift", "eidi", "birthday money"],
};

const normalize = (text) => (text || "").toLowerCase().trim();

const suggestCategory = async (description, userId) => {
  const text = normalize(description);
  if (!text) return null;

  let matchedCategoryName = null;

  for (const [categoryName, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((kw) => text.includes(kw))) {
      matchedCategoryName = categoryName;
      break;
    }
  }

  if (!matchedCategoryName) return null;

  const categoryDoc = await Category.findOne({
    name: { $regex: new RegExp(`^${matchedCategoryName}$`, 'i') },
    $or: [{ isDefault: true }, { user: userId }],
  });

  return categoryDoc || null;
};

const batchCategorize = async (transactions, userId) => {
  return await Promise.all(
    transactions.map(async (txn) => {
      const category = await suggestCategory(txn.description, userId);
      return {
        ...txn,
        category: category ? category._id : txn.category,
      };
    })
  );
};

module.exports = {
  suggestCategory,
  batchCategorize,
};