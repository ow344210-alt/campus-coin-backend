// Vercel serverless function entry point.
// Vercel imports this file and invokes the exported Express application directly,
// so no app.listen() and no persistent server is started inside the function.
const app = require("../app");

module.exports = app;
