
const express = require("express");
const cors = require("cors");

const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const readingRoutes = require("./routes/readingRoutes");
const reportRoutes = require("./routes/reportRoutes");
const authenticateUser = require("./middleware/authMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).send("Sweety Blood Glucose Tracker API is Running!");
});

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await db.query("SELECT NOW()");

        res.status(200).json({
            message: "Database connection successful!",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error("Database test error:", error.message);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/protected", authenticateUser, (req, res) => {
    res.status(200).json({
        message: "Access granted!",
        userId: req.user.id
    });
});

app.use((req, res) => {
    res.status(404).json({
        message: "API endpoint not found"
    });
});

app.use((error, req, res, next) => {
    console.error("Server error:", error.message);

    res.status(500).json({
        message: "Internal server error"
    });
});

module.exports = app;
