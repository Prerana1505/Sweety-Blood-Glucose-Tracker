
import { useCallback, useEffect, useState } from "react";
import { readingAPI, reportAPI } from "../services/api";
import "./Dashboard.css";

const getToday = () => {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
};

const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

// Convert database date into the date input format
const getDateForInput = (date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date(date));

    const values = {};

    parts.forEach((part) => {
        values[part.type] = part.value;
    });

    return `${values.year}-${values.month}-${values.day}`;
};

function Dashboard({ token, user, onLogout }) {
    const [readings, setReadings] = useState([]);
    const [dailyReport, setDailyReport] = useState(null);
    const [monthlyReport, setMonthlyReport] = useState(null);
    const [previousReport, setPreviousReport] = useState(null);

    const [readingDate, setReadingDate] = useState(getToday());
    const [timeSlot, setTimeSlot] = useState("Morning");
    const [glucoseValue, setGlucoseValue] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [historyDate, setHistoryDate] = useState("");
    const [reportDate, setReportDate] = useState(getToday());
    const [reportLoading, setReportLoading] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    // Prepare the last 7 calendar days for the glucose trend chart.
    const glucoseTrend = (() => {
        const today = getToday();
        const [year, month, day] = today.split("-").map(Number);

        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(Date.UTC(year, month - 1, day - 6 + index));
            const dateKey = date.toISOString().slice(0, 10);
            const dayReadings = readings.filter(
                (reading) => getDateForInput(reading.reading_date) === dateKey
            );
            const values = dayReadings.map((reading) =>
                Number(reading.glucose_value)
            );

            return {
                date: dateKey,
                label: date.toLocaleDateString("en-IN", {
                    timeZone: "UTC",
                    day: "2-digit",
                    month: "short"
                }),
                average: values.length
                    ? values.reduce((total, value) => total + value, 0) / values.length
                    : null,
                high: values.length ? Math.max(...values) : null,
                low: values.length ? Math.min(...values) : null,
                count: values.length
            };
        });
    })();

    const trendReadings = glucoseTrend.filter((day) => day.count > 0);
    const trendSummary = {
        average: trendReadings.length
            ? trendReadings.reduce((total, day) => total + day.average, 0) / trendReadings.length
            : null,
        high: trendReadings.length
            ? Math.max(...trendReadings.map((day) => day.high))
            : null,
        low: trendReadings.length
            ? Math.min(...trendReadings.map((day) => day.low))
            : null,
        count: trendReadings.reduce((total, day) => total + day.count, 0)
    };

    const chartValues = trendReadings.flatMap((day) => [day.low, day.high]);
    const chartMin = chartValues.length
        ? Math.max(0, Math.floor((Math.min(...chartValues) - 10) / 10) * 10)
        : 0;
    const chartMax = chartValues.length
        ? Math.ceil((Math.max(...chartValues) + 10) / 10) * 10
        : 200;
    const chartRange = Math.max(chartMax - chartMin, 1);
    const chartX = (index) => 58 + index * 107.3;
    const chartY = (value) => 224 - ((value - chartMin) / chartRange) * 176;
    const averagePath = glucoseTrend.reduce((path, day, index) => {
        if (day.average === null) return path;
        const previousDay = glucoseTrend[index - 1];
        const command = index === 0 || previousDay?.average === null ? "M" : "L";
        return `${path}${command}${chartX(index)},${chartY(day.average)} `;
    }, "");

    // Filter history by the selected date; show all readings when no date is selected.
    const filteredReadings = historyDate
        ? readings.filter(
            (reading) => getDateForInput(reading.reading_date) === historyDate
        )
        : readings;

    // Load readings and reports
    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [
                readingsData,
                dailyData,
                monthlyData,
                previousData
            ] = await Promise.all([
                readingAPI.getAll(token),
                reportAPI.daily(token),
                reportAPI.currentMonth(token),
                reportAPI.previousMonth(token)
            ]);

            setReadings(
                Array.isArray(readingsData)
                    ? readingsData
                    : readingsData.readings || []
            );

            setDailyReport(dailyData);
            setMonthlyReport(monthlyData);
            setPreviousReport(previousData);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // Generate a daily report for the selected date
    const handleGenerateDailyReport = async () => {
        if (!reportDate) {
            setError("Please select a date for the daily report.");
            return;
        }

        setError("");
        setMessage("");

        try {
            setReportLoading(true);
            const reportData = await reportAPI.daily(token, reportDate);
            setDailyReport(reportData);
        } catch (err) {
            setError(err.message || "Unable to generate daily report.");
        } finally {
            setReportLoading(false);
        }
    };

    // Add or update a glucose reading
    const handleAddReading = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        const value = Number(glucoseValue);

        if (!Number.isInteger(value) || value < 40 || value > 600) {
            setError(
                "Glucose value must be a whole number between 40 and 600."
            );
            return;
        }

        const readingData = {
            reading_date: readingDate,
            time_slot: timeSlot,
            glucose_value: value
        };

        try {
            setSaving(true);

            if (editingId !== null) {
                await readingAPI.update(editingId, readingData, token);
                setMessage("Glucose reading updated successfully!");
            } else {
                await readingAPI.add(readingData, token);
                setMessage("Glucose reading added successfully!");
            }

            // Reset form after successful operation
            setEditingId(null);
            setReadingDate(getToday());
            setTimeSlot("Morning");
            setGlucoseValue("");

            await loadDashboard();

        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Load selected reading into the form
    const handleEdit = (reading) => {
        setEditingId(reading.id);
        setReadingDate(getDateForInput(reading.reading_date));
        setTimeSlot(reading.time_slot);
        setGlucoseValue(String(reading.glucose_value));

        setError("");
        setMessage("");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setEditingId(null);
        setReadingDate(getToday());
        setTimeSlot("Morning");
        setGlucoseValue("");
        setError("");
        setMessage("");
    };

    // Delete a glucose reading
    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this reading?"
        );

        if (!confirmed) return;

        try {
            setError("");
            setMessage("");

            await readingAPI.delete(id, token);

            setMessage("Reading deleted successfully!");

            // Exit edit mode if the selected reading is deleted
            if (editingId === id) {
                handleCancelEdit();
            }

            await loadDashboard();

        } catch (err) {
            setError(err.message);
        }
    };

    const SummaryCard = ({ title, value, unit = "" }) => (
        <div className="summary-card">
            <p>{title}</p>
            <h2>
                {value ?? 0} <span>{unit}</span>
            </h2>
        </div>
    );

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="dashboard-brand">
                    <span className="brand-heart">♥</span>
                    <h2>Sweety</h2>
                </div>

                <div className="header-user">
                    <span>Welcome, {user?.name || "User"}</span>
                    <button onClick={onLogout}>Logout</button>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="welcome-section">
                    <div>
                        <h1>Glucose Dashboard</h1>
                        <p>Monitor your daily blood glucose readings.</p>
                    </div>

                    <span className="today-date">
                        {formatDate(getToday())}
                    </span>
                </div>

                {error && (
                    <div className="dashboard-message error">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="dashboard-message success">
                        {message}
                    </div>
                )}

                {/* Last 7 Days Glucose Trend */}
                <section className="glucose-trend-section">
                    <div className="trend-heading">
                        <div>
                            <h2>Glucose Trend</h2>
                            <p>Daily glucose averages and reading ranges for the last 7 days.</p>
                        </div>
                        <span className="trend-period">Last 7 days</span>
                    </div>

                    <div className="trend-summary-grid">
                        <div className="trend-summary-card">
                            <span>Average</span>
                            <strong>{trendSummary.average === null ? "—" : trendSummary.average.toFixed(1)} <small>mg/dL</small></strong>
                        </div>
                        <div className="trend-summary-card">
                            <span>Highest</span>
                            <strong>{trendSummary.high === null ? "—" : trendSummary.high} <small>mg/dL</small></strong>
                        </div>
                        <div className="trend-summary-card">
                            <span>Lowest</span>
                            <strong>{trendSummary.low === null ? "—" : trendSummary.low} <small>mg/dL</small></strong>
                        </div>
                        <div className="trend-summary-card">
                            <span>Total readings</span>
                            <strong>{trendSummary.count}</strong>
                        </div>
                    </div>

                    {trendReadings.length === 0 ? (
                        <p className="trend-empty-message">No glucose readings are available for the last 7 days.</p>
                    ) : (
                        <>
                            <div className="trend-chart-wrapper">
                                <svg
                                    className="trend-chart"
                                    viewBox="0 0 760 275"
                                    role="img"
                                    aria-label="Seven-day glucose trend chart showing daily average and low-to-high reading ranges"
                                >
                                    {[0, 1, 2, 3].map((step) => {
                                        const value = chartMin + (chartRange / 3) * step;
                                        const y = chartY(value);
                                        return (
                                            <g key={step}>
                                                <line x1="48" y1={y} x2="710" y2={y} className="trend-grid-line" />
                                                <text x="39" y={y + 4} textAnchor="end" className="trend-axis-label">
                                                    {Math.round(value)}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {glucoseTrend.map((day, index) => (
                                        <g key={day.date}>
                                            {day.count > 0 && (
                                                <>
                                                    <line
                                                        x1={chartX(index)}
                                                        y1={chartY(day.high)}
                                                        x2={chartX(index)}
                                                        y2={chartY(day.low)}
                                                        className="trend-range-line"
                                                    />
                                                    <line
                                                        x1={chartX(index) - 7}
                                                        y1={chartY(day.high)}
                                                        x2={chartX(index) + 7}
                                                        y2={chartY(day.high)}
                                                        className="trend-range-cap"
                                                    />
                                                    <line
                                                        x1={chartX(index) - 7}
                                                        y1={chartY(day.low)}
                                                        x2={chartX(index) + 7}
                                                        y2={chartY(day.low)}
                                                        className="trend-range-cap"
                                                    />
                                                    <title>{`${day.date}: average ${day.average.toFixed(1)} mg/dL, high ${day.high} mg/dL, low ${day.low} mg/dL, ${day.count} reading(s)`}</title>
                                                </>
                                            )}
                                            <text x={chartX(index)} y="253" textAnchor="middle" className="trend-axis-label">
                                                {day.label}
                                            </text>
                                        </g>
                                    ))}

                                    {averagePath && (
                                        <path d={averagePath} className="trend-average-line" />
                                    )}

                                    {glucoseTrend.map((day, index) => day.count > 0 && (
                                        <circle
                                            key={`${day.date}-average`}
                                            cx={chartX(index)}
                                            cy={chartY(day.average)}
                                            r="6"
                                            className="trend-average-point"
                                        >
                                            <title>{`${day.label}: daily average ${day.average.toFixed(1)} mg/dL`}</title>
                                        </circle>
                                    ))}
                                </svg>
                            </div>

                            <div className="trend-legend">
                                <span><i className="legend-average" /> Daily average</span>
                                <span><i className="legend-range" /> Lowest to highest reading</span>
                            </div>
                        </>
                    )}
                </section>

                {/* Daily Glucose Report */}
                <section className="summary-section">
                    <div className="report-date-toolbar">
                        <div>
                            <h2>Daily Glucose Report</h2>
                            <p className="report-date-description">
                                View glucose statistics for a selected date.
                            </p>
                        </div>

                        <div className="report-date-controls">
                            <label htmlFor="report-date">Select Date:</label>
                            <input
                                id="report-date"
                                type="date"
                                value={reportDate}
                                max={getToday()}
                                onChange={(e) => setReportDate(e.target.value)}
                            />
                            <button
                                type="button"
                                className="generate-report-btn"
                                onClick={handleGenerateDailyReport}
                                disabled={reportLoading || !reportDate}
                            >
                                {reportLoading ? "Loading..." : "Generate Report"}
                            </button>
                        </div>
                    </div>

                    <div className="summary-grid">
                        <SummaryCard
                            title="Highest Reading"
                            value={dailyReport?.high}
                            unit="mg/dL"
                        />

                        <SummaryCard
                            title="Lowest Reading"
                            value={dailyReport?.low}
                            unit="mg/dL"
                        />

                        <SummaryCard
                            title="Average Reading"
                            value={dailyReport?.average}
                            unit="mg/dL"
                        />

                        <SummaryCard
                            title="Total Readings"
                            value={dailyReport?.total_readings}
                        />
                    </div>
                </section>

                {/* Monthly Reports */}
                <section className="report-section">
                    <h2>Monthly Reports</h2>

                    <div className="report-grid">
                        <div className="report-card">
                            <h3>Current Month</h3>

                            <p>
                                Average:{" "}
                                <strong>
                                    {monthlyReport?.average ?? 0} mg/dL
                                </strong>
                            </p>

                            <p>
                                Highest: {monthlyReport?.high ?? 0} mg/dL
                            </p>

                            <p>
                                Lowest: {monthlyReport?.low ?? 0} mg/dL
                            </p>

                            <p>
                                Total readings:{" "}
                                {monthlyReport?.total_readings ?? 0}
                            </p>
                        </div>

                        <div className="report-card">
                            <h3>Previous Month</h3>

                            <p>
                                Average:{" "}
                                <strong>
                                    {previousReport?.average ?? 0} mg/dL
                                </strong>
                            </p>

                            <p>
                                Highest: {previousReport?.high ?? 0} mg/dL
                            </p>

                            <p>
                                Lowest: {previousReport?.low ?? 0} mg/dL
                            </p>

                            <p>
                                Total readings:{" "}
                                {previousReport?.total_readings ?? 0}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Add / Edit Reading Form */}
                <section className="add-reading-section">
                    <h2>
                        {editingId !== null
                            ? "Edit Glucose Reading"
                            : "Add Glucose Reading"}
                    </h2>

                    <form onSubmit={handleAddReading}>
                        <div className="reading-form-grid">
                            <div className="form-group">
                                <label>Reading Date</label>

                                <input
                                    type="date"
                                    value={readingDate}
                                    max={getToday()}
                                    onChange={(e) =>
                                        setReadingDate(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Time Slot</label>

                                <select
                                    value={timeSlot}
                                    onChange={(e) =>
                                        setTimeSlot(e.target.value)
                                    }
                                >
                                    <option>Morning</option>
                                    <option>After breakfast</option>
                                    <option>After lunch</option>
                                    <option>After dinner</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Glucose Value (mg/dL)</label>

                                <input
                                    type="number"
                                    min="40"
                                    max="600"
                                    step="1"
                                    placeholder="Enter glucose value"
                                    value={glucoseValue}
                                    onChange={(e) =>
                                        setGlucoseValue(e.target.value)
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                className="primary-btn"
                                type="submit"
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving..."
                                    : editingId !== null
                                        ? "Update Reading"
                                        : "Add Reading"}
                            </button>

                            {editingId !== null && (
                                <button
                                    className="cancel-btn"
                                    type="button"
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                {/* Reading History */}
                <section className="readings-section">
                    <div className="section-heading">
                        <h2>Reading History</h2>

                        <button
                            className="refresh-btn"
                            onClick={loadDashboard}
                            disabled={loading}
                        >
                            Refresh
                        </button>
                    </div>

                    <div className="history-filter">
                        <label htmlFor="history-date">Filter by Date:</label>
                        <input
                            id="history-date"
                            type="date"
                            value={historyDate}
                            max={getToday()}
                            onChange={(e) => setHistoryDate(e.target.value)}
                        />
                        <button
                            type="button"
                            className="clear-filter-btn"
                            onClick={() => setHistoryDate("")}
                            disabled={!historyDate}
                        >
                            Clear Filter
                        </button>
                    </div>

                    {loading ? (
                        <p className="empty-message">
                            Loading readings...
                        </p>
                    ) : readings.length === 0 ? (
                        <p className="empty-message">
                            No readings available. Add your first reading.
                        </p>
                    ) : filteredReadings.length === 0 ? (
                        <p className="empty-message">
                            No readings found for the selected date.
                        </p>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Time Slot</th>
                                        <th>Glucose Value</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredReadings.map((reading) => (
                                        <tr key={reading.id}>
                                            <td>
                                                {formatDate(reading.reading_date)}
                                            </td>

                                            <td>{reading.time_slot}</td>

                                            <td>
                                                <strong>
                                                    {reading.glucose_value} mg/dL
                                                </strong>
                                            </td>

                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="edit-btn"
                                                        onClick={() =>
                                                            handleEdit(reading)
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        className="delete-btn"
                                                        onClick={() =>
                                                            handleDelete(reading.id)
                                                        }
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default Dashboard;
