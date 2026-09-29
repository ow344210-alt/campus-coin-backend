const PDFDocument = require("pdfkit");

const generatePdfReport = (user, transactions, options = {}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));

    const startDateStr = options.startDate ? new Date(options.startDate).toLocaleDateString() : 'N/A';
    const endDateStr = options.endDate ? new Date(options.endDate).toLocaleDateString() : 'N/A';

    doc.fontSize(20).text("CampusCoin - Financial Report", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`User: ${user.name || user.email} | Range: ${startDateStr} - ${endDateStr}`, { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(14).text("Transaction Details", { underline: true });
    doc.moveDown(0.8);

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t) => {
      const dateStr = t.date ? new Date(t.date).toLocaleDateString() : "-";
      const categoryName = typeof t.category === "object" && t.category !== null ? t.category.name : t.category || "Uncategorized";
      const amount = Number(t.amount) || 0;
      const type = (t.type || "expense").toUpperCase();

      if (type === "INCOME") totalIncome += amount;
      if (type === "EXPENSE") totalExpense += amount;

      doc
        .fontSize(10)
        .text(
          `${dateStr}  |  ${type}  |  ${categoryName}  |  $${amount.toFixed(2)}  |  ${t.description || "-"}`
        );
      doc.moveDown(0.2);
    });

    doc.moveDown(1.5);
    doc.fontSize(12).text(`Total Income: $${totalIncome.toFixed(2)}`);
    doc.fontSize(12).text(`Total Expense: $${totalExpense.toFixed(2)}`);
    doc.fontSize(12).text(`Net Balance: $${(totalIncome - totalExpense).toFixed(2)}`);

    doc.end();
  });
};

module.exports = { generatePdfReport };