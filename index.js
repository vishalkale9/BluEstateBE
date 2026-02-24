const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// Load Environment Variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Enable CORS
app.use(cors());

// Standard Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Uploads Folder
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Test Route
app.get("/", (req, res) => {
    res.json({ message: "BluEstate Backend API is running..." });
});

// Mount Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/assets", require("./routes/assetRoutes"));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
