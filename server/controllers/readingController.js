
const db = require("../config/db");

// Allowed glucose reading time slots
const allowedSlots = [
    "Morning",
    "After breakfast",
    "After lunch",
    "After dinner"
];

// Validate reading input
const validateReading = (reading_date, time_slot, glucose_value) => {
    if (!reading_date || !time_slot || glucose_value === undefined) {
        return "Date, time slot and glucose value are required.";
    }

    // Validate date format
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(reading_date)) {
        return "Invalid reading date.";
    }

    const [year, month, day] = reading_date.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return "Invalid reading date.";
    }

    // Prevent future dates using Indian timezone
    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());

    if (reading_date > today) {
        return "Future dates are not allowed.";
    }

    // Validate time slot
    if (!allowedSlots.includes(time_slot)) {
        return "Invalid time slot.";
    }

    // Validate glucose value
    if (
        !Number.isInteger(glucose_value) ||
        glucose_value < 40 ||
        glucose_value > 600
    ) {
        return "Glucose value must be an integer between 40 and 600.";
    }

    return null;
};


// 1. ADD GLUCOSE READING
const addReading = async (req, res) => {
    try {
        const { reading_date, time_slot, glucose_value } = req.body;

        const validationError = validateReading(
            reading_date,
            time_slot,
            glucose_value
        );

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        const result = await db.query(
            `INSERT INTO readings
             (user_id, reading_date, time_slot, glucose_value)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [req.user.id, reading_date, time_slot, glucose_value]
        );

        res.status(201).json({
            message: "Glucose reading added successfully!",
            reading: result.rows[0]
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "A reading already exists for this date and time slot."
            });
        }

        console.error("Add reading error:", error.message);

        res.status(500).json({
            message: "Failed to add glucose reading."
        });
    }
};


// 2. GET ALL GLUCOSE READINGS
const getReadings = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT *
             FROM readings
             WHERE user_id = $1
             ORDER BY reading_date DESC, id DESC`,
            [req.user.id]
        );

        res.status(200).json({
            message: "Glucose readings retrieved successfully!",
            readings: result.rows
        });

    } catch (error) {
        console.error("Get readings error:", error.message);

        res.status(500).json({
            message: "Failed to retrieve glucose readings."
        });
    }
};


// 3. UPDATE GLUCOSE READING
const updateReading = async (req, res) => {
    try {
        const { id } = req.params;
        const { reading_date, time_slot, glucose_value } = req.body;

        if (!/^\d+$/.test(id) || Number(id) < 1) {
            return res.status(400).json({
                message: "Invalid reading ID."
            });
        }

        const validationError = validateReading(
            reading_date,
            time_slot,
            glucose_value
        );

        if (validationError) {
            return res.status(400).json({
                message: validationError
            });
        }

        const result = await db.query(
            `UPDATE readings
             SET reading_date = $1,
                 time_slot = $2,
                 glucose_value = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND user_id = $5
             RETURNING *`,
            [reading_date, time_slot, glucose_value, id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Reading not found."
            });
        }

        res.status(200).json({
            message: "Glucose reading updated successfully!",
            reading: result.rows[0]
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "A reading already exists for this date and time slot."
            });
        }

        console.error("Update reading error:", error.message);

        res.status(500).json({
            message: "Failed to update glucose reading."
        });
    }
};


// 4. DELETE GLUCOSE READING
const deleteReading = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id) || Number(id) < 1) {
            return res.status(400).json({
                message: "Invalid reading ID."
            });
        }

        const result = await db.query(
            `DELETE FROM readings
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Reading not found."
            });
        }

        res.status(200).json({
            message: "Glucose reading deleted successfully!",
            reading: result.rows[0]
        });

    } catch (error) {
        console.error("Delete reading error:", error.message);

        res.status(500).json({
            message: "Failed to delete glucose reading."
        });
    }
};


module.exports = {
    addReading,
    getReadings,
    updateReading,
    deleteReading
};
