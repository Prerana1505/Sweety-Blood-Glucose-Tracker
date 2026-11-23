
const request = require("supertest");
const app = require("../app");
const db = require("../config/db");

describe("Sweety API Tests", () => {

    test("GET / should return API running message", async () => {
        const response = await request(app).get("/");

        expect(response.statusCode).toBe(200);
        expect(response.text).toBe(
            "Sweety Blood Glucose Tracker API is Running!"
        );
    });

    test("Invalid endpoint should return 404", async () => {
        const response = await request(app).get("/invalid-endpoint");

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe("API endpoint not found");
    });

});

afterAll(async () => {
    await db.end();
});
