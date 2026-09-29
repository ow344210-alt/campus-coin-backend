// Local development entry point.
// The Express application itself lives in app.js so that Vercel can import it
// without ever starting a persistent listener.
const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
