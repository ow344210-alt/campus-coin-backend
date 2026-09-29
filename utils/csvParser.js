const fs = require("fs");
const { parse } = require("csv-parse");

const VALID_TYPES = ["income", "expense"];

const validateRow = (row, rowNumber) => {
  const { date, type, category, amount, description } = row;

  if (!date || isNaN(Date.parse(date))) {
    return { error: `Row ${rowNumber}: invalid or missing date` };
  }
  if (!VALID_TYPES.includes((type || "").toLowerCase())) {
    return { error: `Row ${rowNumber}: type must be "income" or "expense"` };
  }
  if (!category) {
    return { error: `Row ${rowNumber}: category is required` };
  }
  
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return { error: `Row ${rowNumber}: amount must be a positive number` };
  }

  return {
    transaction: {
      date: new Date(date),
      type: type.toLowerCase(),
      category: category.trim(),
      amount: numericAmount,
      description: (description || "").trim(),
      source: "csv_import",
    },
  };
};

const parseTransactionCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const valid = [];
    const errors = [];
    let rowNumber = 1;

    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true,
          trim: true,
          skip_empty_lines: true,
        })
      )
      .on("data", (row) => {
        rowNumber++;
        const { error, transaction } = validateRow(row, rowNumber);
        if (error) {
          errors.push(error);
        } else {
          valid.push(transaction);
        }
      })
      .on("end", () => {
        fs.unlink(filePath, () => {});
        resolve({ valid, errors });
      })
      .on("error", (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
  });
};

module.exports = { parseTransactionCSV };