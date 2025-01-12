const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/mernDatabase", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Define schema and model
const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  dateOfSale: Date,
  category: String, 
  sold: Boolean,
});

// ollection name 'mernTransaction'
const MernTransaction = mongoose.model(
  "MernTransaction",
  transactionSchema,
  "mernTransaction"
);

// Initialize database with third-party data
app.post("/api/initialize-database", async (req, res) => {
  try {
    console.log("Fetching data from third-party API...");
    const response = await fetch(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.error("No data fetched from the third-party API.");
      return res
        .status(500)
        .json({ error: "No data fetched from the third-party API" });
    }

    console.log(`Fetched ${data.length} records. Inserting into database...`);

    // Clear existing data in the collection
    await MernTransaction.deleteMany();

    // Insert the fetched data into the database
    const insertedData = await MernTransaction.insertMany(data);
    console.log(`Inserted ${insertedData.length} records into the database.`);

    res.status(200).json({ message: "Database initialized with seed data." });
  } catch (error) {
    console.error("Error initializing database:", error.message);
    res
      .status(500)
      .json({ error: "Error initializing database", details: error.message });
  }
});

// Transactions API with search and pagination
app.get("/api/transactions", async (req, res) => {
  const { month, search = "", page = 1, perPage = 4 } = req.query;

  if (!month) {
    return res.status(400).send({ error: "Month parameter is required" });
  }

  // Convert the month string (e.g., "January") to a month index (0 for January)
  const monthIndex = new Date(`${month} 1, 2023`).getMonth(); // January is 0, December is 11

  if (monthIndex === -1) {
    return res.status(400).send({ error: "Invalid month format" });
  }

  const query = {
    $expr: {
      $eq: [{ $month: "$dateOfSale" }, monthIndex + 1], // MongoDB $month is 1-based
    },
  };

  if (search) {
    const searchRegex = { $regex: search, $options: "i" }; // Case-insensitive regex

    query.$or = [{ title: searchRegex }, { description: searchRegex }];

    // Add a numeric filter for price if the search query is numeric
    if (!isNaN(search)) {
      query.$or.push({ price: Number(search) });
    }
  }

  try {
    // Fetch matching transactions with pagination
    const transactions = await MernTransaction.find(query)
      .skip((page - 1) * perPage)
      .limit(Number(perPage));
    res.status(200).send(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    res
      .status(500)
      .send({ error: "Error fetching transactions", details: error.message });
  }
});

// Total Sale, Sold Items, Not Sold Items
app.get("/api/statistics", async (req, res) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).send({ error: "Month parameter is required" });
  }

  const monthIndex = new Date(`${month} 1, 2023`).getMonth();

  try {
    const transactions = await MernTransaction.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] },
        },
      },
      {
        $group: {
          _id: null,
          totalSaleAmount: { $sum: "$price" },
          soldItems: { $sum: 1 },
          notSoldItems: { $sum: { $cond: [{ $eq: ["$price", 0] }, 1, 0] } },
          // notSoldItems: { $sum: { $cond: [{ $eq: ['$sold', false] }, 1, 0] } },
        },
      },
    ]);

    res.status(200).json(transactions[0]);
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res
      .status(500)
      .send({ error: "Error fetching statistics", details: error.message });
  }
});

// Bar Chart Data
app.get("/api/bar-chart", async (req, res) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).send({ error: "Month parameter is required" });
  }

  const monthIndex = new Date(`${month} 1, 2023`).getMonth();

  try {
    const priceRanges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: Infinity },
    ];

    const priceRangeCounts = await Promise.all(
      priceRanges.map(async (range) => {
        const count = await MernTransaction.countDocuments({
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] },
          price: { $gte: range.min, $lte: range.max },
        });
        return {
          priceRange: `${range.min}-${
            range.max === Infinity ? "above" : range.max
          }`,
          count,
        };
      })
    );

    res.status(200).json(priceRangeCounts);
  } catch (error) {
    console.error("Error fetching bar chart data:", error);
    res
      .status(500)
      .send({ error: "Error fetching bar chart data", details: error.message });
  }
});

// Pie Chart Data (Category Distribution)
app.get("/api/pie-chart", async (req, res) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).send({ error: "Month parameter is required" });
  }

  const monthIndex = new Date(`${month} 1, 2023`).getMonth();

  try {
    const categoryCounts = await MernTransaction.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] },
        },
      },
      {
        $group: {
          _id: "$category", // assuming you have a category field
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json(categoryCounts);
  } catch (error) {
    console.error("Error fetching pie chart data:", error);
    res
      .status(500)
      .send({ error: "Error fetching pie chart data", details: error.message });
  }
});

// Combined API (All Statistics)
app.get("/api/combined-statistics", async (req, res) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).send({ error: "Month parameter is required" });
  }

  try {
    const [statistics, barChartData, pieChartData] = await Promise.all([
      getStatistics(month),
      getBarChartData(month),
      getPieChartData(month),
    ]);

    res.status(200).json({
      statistics,
      barChartData,
      pieChartData,
    });
  } catch (error) {
    console.error("Error fetching combined data:", error);
    res
      .status(500)
      .send({ error: "Error fetching combined data", details: error.message });
  }
});

// Function for get statistics (total sale amount, sold, and not sold items)
const getStatistics = async (month) => {
  const monthIndex = new Date(`${month} 1, 2023`).getMonth();

  const totalSaleAmount = await MernTransaction.aggregate([
    { $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] } } },
    { $group: { _id: null, totalSaleAmount: { $sum: "$price" } } },
  ]);

  const soldItems = await MernTransaction.countDocuments({
    $expr: { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] },
    sold: true,
  });

  const notSoldItems = await MernTransaction.countDocuments({
    $expr: { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] },
    sold: false,
  });

  return {
    totalSaleAmount: totalSaleAmount[0]?.totalSaleAmount || 0,
    soldItems,
    notSoldItems,
  };
};

// Function for get bar chart data
const getBarChartData = async (month) => {
  const monthIndex = new Date(`${month} 1, 2023`).getMonth();

  const priceRanges = [
    { min: 0, max: 100 },
    { min: 101, max: 200 },
    { min: 201, max: 300 },
    { min: 301, max: 400 },
    { min: 401, max: 500 },
    { min: 501, max: 600 },
    { min: 601, max: 700 },
    { min: 701, max: 800 },
    { min: 801, max: 900 },
    { min: 901, max: Infinity },
  ];

  const priceRangeCounts = await Promise.all(
    priceRanges.map(async (range) => {
      const count = await MernTransaction.countDocuments({
        $expr: { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] },
        price: { $gte: range.min, $lte: range.max },
      });
      return {
        priceRange: `${range.min}-${
          range.max === Infinity ? "above" : range.max
        }`,
        count,
      };
    })
  );

  return priceRangeCounts;
};

// Function to get pie chart data (categories)
const getPieChartData = async (month) => {
  const monthIndex = new Date(`${month} 1, 2023`).getMonth();

  const categoryCounts = await MernTransaction.aggregate([
    { $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  return categoryCounts;
};

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
