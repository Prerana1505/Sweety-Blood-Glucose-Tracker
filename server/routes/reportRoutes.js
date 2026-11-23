
const express = require("express");
const router = express.Router();

const authenticateUser = require("../middleware/authMiddleware");

const {
    getDailyReport,
    getCurrentMonthReport,
    getPreviousMonthReport
} = require("../controllers/reportController");

// All report routes require login
router.use(authenticateUser);

router.get("/daily", getDailyReport);
router.get("/current-month", getCurrentMonthReport);
router.get("/previous-month", getPreviousMonthReport);

module.exports = router;
