const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;
const uri = process.env.MONGODB_URI;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://thebayicon.com",
      "https://www.thebayicon.com",
      "https://bayicon-1926f.web.app/",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());

let db;
let client;

async function connectDB() {
  if (!uri) {
    throw new Error("MONGODB_URI is missing. Add it in Vercel Environment Variables.");
  } 

  if (db) return db;

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  db = client.db("bayicon");
  return db;
}

app.get("/", (req, res) => {
  res.status(200).send("Bay Icon API is running...");
});

app.get("/api/leads", async (req, res) => {
  try {
    const database = await connectDB();
    const leadCollection = database.collection("leads");
    const leads = await leadCollection.find().sort({ createdAt: -1 }).toArray();

    res.status(200).json({ success: true, data: leads });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

app.post("/api/leads", async (req, res) => {
  try {
    const { name, mobile, address, preferredLocation } = req.body;

    if (!name || !mobile || !address || !Array.isArray(preferredLocation) || preferredLocation.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const database = await connectDB();
    const leadCollection = database.collection("leads");

    const result = await leadCollection.insertOne({
      name,
      mobile,
      address,
      preferredLocation,
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      message: "Lead submitted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}else{console.log(`Server running on ${process.env.VERCEL}`)};

module.exports = app;