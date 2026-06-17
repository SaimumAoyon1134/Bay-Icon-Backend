const express = require("express");

const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is missing. Please add it to your .env file.");
  process.exit(1);
}
const PORT = process.env.PORT || 5001;


const cors = require("cors");

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    console.log("Connected to MongoDB");

    const leadCollection = client
      .db("bayicon")
      .collection("leads");

    app.get("/", (req, res) => {
      res.send("Bay Icon API is running...");
    });

    app.get("/api/leads", async (req, res) => {
      try {
        const leads = await leadCollection.find().sort({ createdAt: -1 }).toArray();
        res.json({ success: true, data: leads });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          message: "Internal Server Error",
        });
      }
    });

    app.post("/api/leads", async (req, res) => {
      try {
        const { name, mobile, address, preferredLocation } = req.body;

        if (
          !name ||
          !mobile ||
          !address ||
          !preferredLocation ||
          preferredLocation.length === 0
        ) {
          return res.status(400).json({
            success: false,
            message: "All fields are required",
          });
        }

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
          message: "Internal Server Error",
        });
      }
    });

   
  } catch (error) {
    console.error(error);
  }
}

run();