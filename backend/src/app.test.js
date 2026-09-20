import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createDatabase } from "./database.js";

describe("health endpoint", () => {
  it("returns API status", async () => {
    const database = await createDatabase();
    const response = await request(createApp({ database })).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "neo-musica-api",
    });
    database.close();
  });
});

describe("auth endpoints", () => {
  it("registers, reads the current user, and logs out", async () => {
    const database = await createDatabase();
    const app = createApp({ database });
    const registerResponse = await request(app).post("/api/auth/register").send({
      displayName: "Frankleen",
      email: "frankleen@example.com",
      password: "password123",
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.token).toBeTruthy();
    expect(registerResponse.body.user).toMatchObject({
      displayName: "Frankleen",
      email: "frankleen@example.com",
    });

    const token = registerResponse.body.token;
    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.email).toBe("frankleen@example.com");

    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(logoutResponse.status).toBe(204);

    const signedOutResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(signedOutResponse.status).toBe(401);
    database.close();
  });

  it("logs in an existing user", async () => {
    const database = await createDatabase();
    const app = createApp({ database });

    await request(app).post("/api/auth/register").send({
      displayName: "Creator",
      email: "creator@example.com",
      password: "password123",
    });

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "creator@example.com",
      password: "password123",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeTruthy();
    expect(loginResponse.body.user.displayName).toBe("Creator");
    database.close();
  });
});
