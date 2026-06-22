const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;
const uri = process.env.MONGODB_URI;

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://thebayicon.com",
  "https://www.thebayicon.com",
  "https://bayicon-1926f.web.app",
  "https://bayicon-1926f.firebaseapp.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "OPTIONS", "DELETE"],
    allowedHeaders: ["Content-Type"],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF resume is allowed"));
    }
    cb(null, true);
  },
});

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
    const { name, mobile, email, preferredLocation } = req.body;

    if (!name || !mobile || !email || !Array.isArray(preferredLocation) || preferredLocation.length === 0) {
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
      email,
      preferredLocation,
      status: "New",
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

app.put("/api/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ["New", "Decision Pending", "Confirmed", "Declined"];

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const database = await connectDB();
    const leadCollection = database.collection("leads");

    const result = await leadCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

app.delete("/api/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const database = await connectDB();
    const leadCollection = database.collection("leads");

    const result = await leadCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});
app.post("/api/careers", upload.single("resume"), async (req, res) => {
  try {
    const { name, mobile, gmail, experienceYear, coverLetter } = req.body;

    if (!name || !mobile || !gmail || !experienceYear || !coverLetter || !req.file) {
      return res.status(400).json({
        success: false,
        message: "All fields including resume PDF are required",
      });
    }

    const database = await connectDB();
    const careerCollection = database.collection("careers");

    const result = await careerCollection.insertOne({
      name,
      mobile,
      gmail,
      experienceYear,
      coverLetter,
      resume: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      },
      status: "New",
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      message: "Career application submitted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});
app.get("/api/careers", async (req, res) => {
  try {
    const database = await connectDB();
    const careerCollection = database.collection("careers");

    const careers = await careerCollection
      .find({}, { projection: { "resume.buffer": 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: careers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});
app.get("/api/careers/:id/resume", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid career application ID",
      });
    }

    const database = await connectDB();
    const careerCollection = database.collection("careers");

    const application = await careerCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!application || !application.resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    res.set({
      "Content-Type": application.resume.mimeType,
      "Content-Disposition": `attachment; filename="${application.resume.originalName}"`,
    });

    res.send(application.resume.buffer.buffer);
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
}

module.exports = app;