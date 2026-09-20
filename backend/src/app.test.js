import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createDatabase } from "./database.js";

async function createAuthenticatedApp() {
  const database = await createDatabase();
  const uploadsPath = fs.mkdtempSync(path.join(os.tmpdir(), "neo-musica-uploads-"));
  const app = createApp({ database, uploadsPath });
  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      displayName: "Creator",
      email: `creator-${randomUUID()}@example.com`,
      password: "password123",
    });

  return {
    app,
    database,
    uploadsPath,
    token: registerResponse.body.token,
    user: registerResponse.body.user,
  };
}

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

describe("song endpoints", () => {
  it("uploads, lists, edits, and deletes a song", async () => {
    const { app, database, uploadsPath, token, user } = await createAuthenticatedApp();

    const uploadResponse = await request(app)
      .post("/api/songs")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "First Signal")
      .field("artistName", user.displayName)
      .field("tags", "#indie, discovery")
      .attach("audioFile", Buffer.from("fake mp3 data"), {
        filename: "first-signal.mp3",
        contentType: "audio/mpeg",
      })
      .attach("coverImage", Buffer.from("fake image data"), {
        filename: "cover.png",
        contentType: "image/png",
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.song).toMatchObject({
      title: "First Signal",
      artistName: user.displayName,
      tags: ["#indie", "#discovery"],
    });

    const listResponse = await request(app)
      .get("/api/songs/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.songs).toHaveLength(1);
    expect(listResponse.body.remaining).toBe(9);

    const songId = uploadResponse.body.song.id;
    const updateResponse = await request(app)
      .patch(`/api/songs/${songId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "First Signal Updated",
        artistName: "New Artist Name",
        tags: "alt pop",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.song).toMatchObject({
      title: "First Signal Updated",
      artistName: "New Artist Name",
      tags: ["#alt", "#pop"],
    });

    const deleteResponse = await request(app)
      .delete(`/api/songs/${songId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);

    const emptyListResponse = await request(app)
      .get("/api/songs/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(emptyListResponse.body.songs).toHaveLength(0);

    database.close();
    fs.rmSync(uploadsPath, { recursive: true, force: true });
  });

  it("limits creators to 10 songs", async () => {
    const { app, database, uploadsPath, token } = await createAuthenticatedApp();

    for (let index = 1; index <= 10; index += 1) {
      const response = await request(app)
        .post("/api/songs")
        .set("Authorization", `Bearer ${token}`)
        .field("title", `Song ${index}`)
        .field("artistName", "Creator")
        .attach("audioFile", Buffer.from(`fake song ${index}`), {
          filename: `song-${index}.mp3`,
          contentType: "audio/mpeg",
        });

      expect(response.status).toBe(201);
    }

    const tooManyResponse = await request(app)
      .post("/api/songs")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Song 11")
      .field("artistName", "Creator")
      .attach("audioFile", Buffer.from("fake song 11"), {
        filename: "song-11.mp3",
        contentType: "audio/mpeg",
      });

    expect(tooManyResponse.status).toBe(409);
    expect(tooManyResponse.body.message).toMatch(/up to 10 songs/i);

    database.close();
    fs.rmSync(uploadsPath, { recursive: true, force: true });
  });
});
