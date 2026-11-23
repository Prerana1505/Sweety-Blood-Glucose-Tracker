const db = require("../config/db");

// Get today's date in Indian Standard Time
const getTodayIST = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const values = {};
    parts.forEach((part) => {
        values[part.type] = part.value;
    });

    return `${values.year}-${values.month}-${values.day}`;
};

// Validate YYYY-MM-DD
const isValidDate = (date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsed = new Date(`${date}T00:00:00Z`);

    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date
    );
};

// Get glucose statistics for a date range
const getReport = async (userId, startDate, endDate) => {
    const result = await db.query(
        `SELECT
            MAX(glucose_value)::int AS high,
            MIN(glucose_value)::int AS low,
            ROUND(AVG(glucose_value)::numeric, 1)::float AS average,
            COUNT(*)::int AS total_readings
         FROM readings
         WHERE user_id = $1
         AND reading_date >= $2
         AND reading_date < $3`,
        [userId, startDate, endDate]
    );

    return result.rows[0];
};

// Daily report
const getDailyReport = async (req, res) => {
    try {
        const date = req.query.date || getTodayIST();

        if (!isValidDate(date)) {
            return res.status(400).json({
                message: "Please provide a valid date in YYYY-MM-DD format."
            });
        }

        const nextDate = new Date(`${date}T00:00:00Z`);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);

        const endDate = nextDate.toISOString().slice(0, 10);

        const report = await getReport(req.user.id, date, endDate);

        res.status(200).json({
            report_type: "Daily",
            date,
            ...report
        });
    } catch (error) {
        console.error("Daily report error:", error.message);

        res.status(500).json({
            message: "Unable to generate daily report."
        });
    }
};

// Current month report
const getCurrentMonthReport = async (req, res) => {
    try {
        const today = getTodayIST();
        const [year, month] = today.split("-").map(Number);

        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

        const nextMonth = new Date(Date.UTC(year, month, 1));
        const endDate = nextMonth.toISOString().slice(0, 10);

        const report = await getReport(req.user.id, startDate, endDate);

        res.status(200).json({
            report_type: "Current Month",
            start_date: startDate,
            end_date: today,
            ...report
        });
    } catch (error) {
        console.error("Current month report error:", error.message);

        res.status(500).json({
            message: "Unable to generate current month report."
        });
    }
};

// Previous month report
const getPreviousMonthReport = async (req, res) => {
    try {
        const today = getTodayIST();
        const [year, month] = today.split("-").map(Number);

        const firstDayOfCurrentMonth = new Date(Date.UTC(year, month - 1, 1));

        const lastMonth = new Date(
            Date.UTC(
                firstDayOfCurrentMonth.getUTCFullYear(),
                firstDayOfCurrentMonth.getUTCMonth() - 1,
                1
            )
        );

        const startDate = lastMonth.toISOString().slice(0, 10);

        const endDate = firstDayOfCurrentMonth.toISOString().slice(0, 10);

        const report = await getReport(req.user.id, startDate, endDate);

        res.status(200).json({
            report_type: "Previous Month",
            start_date: startDate,
            end_date: new Date(Date.UTC(year, month - 1, 0))
                .toISOString()
                .slice(0, 10),
            ...report
        });
    } catch (error) {
        console.error("Previous month report error:", error.message);

        res.status(500).json({
            message: "Unable to generate previous month report."
        });
    }
};

module.exports = {
    getDailyReport,
    getCurrentMonthReport,
    getPreviousMonthReport
};