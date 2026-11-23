
const API_URL = "http://localhost:5000/api";

const request = async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.token
                ? { Authorization: `Bearer ${options.token}` }
                : {}),
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
    }

    return data;
};

export const authAPI = {
    register: (userData) =>
        request("/auth/register", {
            method: "POST",
            body: JSON.stringify(userData)
        }),

    login: (userData) =>
        request("/auth/login", {
            method: "POST",
            body: JSON.stringify(userData)
        })
};

export const readingAPI = {
    getAll: (token) =>
        request("/readings", { token }),

    add: (readingData, token) =>
        request("/readings", {
            method: "POST",
            token,
            body: JSON.stringify(readingData)
        }),

    update: (id, readingData, token) =>
        request(`/readings/${id}`, {
            method: "PUT",
            token,
            body: JSON.stringify(readingData)
        }),

    delete: (id, token) =>
        request(`/readings/${id}`, {
            method: "DELETE",
            token
        })
};

export const reportAPI = {
    daily: (token, date = "") =>
        request(
            `/reports/daily${date ? `?date=${date}` : ""}`,
            { token }
        ),

    currentMonth: (token) =>
        request("/reports/current-month", { token }),

    previousMonth: (token) =>
        request("/reports/previous-month", { token })
};
