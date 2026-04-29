const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    message: "Response from backend server",
    port: PORT,
    hostname: require("os").hostname(),
  });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
