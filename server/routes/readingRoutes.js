
const express = require("express");
const router = express.Router();

const authenticateUser = require("../middleware/authMiddleware");

const {
    addReading,
    getReadings,
    updateReading,
    deleteReading
} = require("../controllers/readingController");

// All routes require JWT authentication
router.use(authenticateUser);

// Add reading
router.post("/", addReading);

// Get all readings
router.get("/", getReadings);

// Update reading
router.put("/:id", updateReading);

// Delete reading
router.delete("/:id", deleteReading);

module.exports = router;
