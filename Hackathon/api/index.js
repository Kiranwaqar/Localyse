const app = require("../backend/app");
const connectDB = require("../backend/config/db");

let connectPromise;

module.exports = async (req, res) => {
  if (!connectPromise) {
    connectPromise = connectDB();
  }

  try {
    await connectPromise;
    return app(req, res);
  } catch (error) {
    console.error("Vercel API startup failed:", error.message);
    res.statusCode = 500;
    return res.end(
      JSON.stringify({
        message: "API failed to connect to the database.",
      })
    );
  }
};
