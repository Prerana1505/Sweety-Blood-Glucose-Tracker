const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// USER REGISTRATION
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required."
            });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        // Validate password
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long."
            });
        }

        // Check whether email already exists
        const existingUser = await db.query(
            "SELECT id FROM users WHERE email = $1",
            [email.trim().toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email is already registered."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into database
        const result = await db.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING id, name, email`,
            [name.trim(), email.trim().toLowerCase(), hashedPassword]
        );

        res.status(201).json({
            message: "Registration successful!",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        res.status(500).json({
            message: "Internal server error."
        });
    }
};


// USER LOGIN
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        // Find user by email
        const result = await db.query(
            "SELECT * FROM users WHERE email = $1",
            [email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = result.rows[0];

        // Compare password with hashed password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            message: "Internal server error."
        });
    }
};

module.exports = {
    registerUser,
    loginUser
};