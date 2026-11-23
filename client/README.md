
# Sweety – Blood Glucose Tracker

Sweety is a full-stack web application that helps users record, manage, and monitor their daily blood glucose levels. It provides reading history, reports, and a visual chart to track glucose trends.

## Features

- User registration and login.
- Secure password hashing using bcrypt.
- JWT-based authentication.
- Add, view, update, and delete glucose readings.
- Record readings for four time slots:
  - Morning
  - After Breakfast
  - After Lunch
  - After Dinner
- View reading history and filter readings by date.
- Daily glucose reports for selected dates.
- Current-month and previous-month reports.
- View high, low, average, and total readings.
- Seven-day glucose trend chart.
- User-specific reading data.
- Input validation for glucose values and dates.

## Technologies Used

### Frontend
- React.js
- Vite
- JavaScript
- HTML
- CSS

### Backend
- Node.js
- Express.js
- PostgreSQL
- JSON Web Token (JWT)
- bcrypt
- CORS

## Project Structure

```text
Sweety/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── ...
│   └── package.json
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── scripts/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── README.md
```

## Prerequisites

Make sure you have installed:

- Node.js
- npm
- PostgreSQL

## Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Sweety
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file inside the `server` folder and configure your database credentials:

```env
PORT=5000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=sweety_db
DB_PASSWORD=poster
DB_PORT=5432
JWT_SECRET=0aed23129a4914cc37f18d58b3b9a32fe42771ac5b34c11239d15247cb890c7a318a5fa581c44bb9f4b9b8704ae4024264dce8aa46068e632e34d596174e7ca7
```

Create the PostgreSQL database named `sweety_db` and ensure the required tables are created.

Start the backend:

```bash
npm run dev
```

The backend runs at:

`http://localhost:5000`

### 3. Frontend Setup

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL displayed in your terminal, usually:

`http://localhost:5173`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |

### Glucose Readings

All reading endpoints require JWT authentication.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/readings` | Add a reading |
| GET | `/api/readings` | Get all readings |
| PUT | `/api/readings/:id` | Update a reading |
| DELETE | `/api/readings/:id` | Delete a reading |

### Reports

All report endpoints require JWT authentication.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/daily` | Get a daily report |
| GET | `/api/reports/current-month` | Get the current month's report |
| GET | `/api/reports/previous-month` | Get the previous month's report |

For a custom daily report, pass a date in `YYYY-MM-DD` format:

`/api/reports/daily?date=2026-11-23`

## Validation Rules

- Glucose values must be integers between 40 and 600 mg/dL.
- Future reading dates are not allowed.
- Only the four supported time slots are accepted.
- A user cannot add duplicate readings for the same date and time slot.
- Users can access only their own readings.

## Security

- Passwords are hashed using bcrypt.
- JWT is used to authenticate protected API requests.
- User-specific data access is enforced by the backend.
- Environment variables are used for sensitive configuration.

## Author

**Prerana Thogataveer**

GitHub: https://github.com/Prerana1505
