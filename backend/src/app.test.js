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

  it("uploads a profile picture for the current user", async () => {
    const { app, database, uploadsPath, token } = await createAuthenticatedApp();

    const uploadResponse = await request(app)
      .post("/api/profile/image")
      .set("Authorization", `Bearer ${token}`)
      .attach("profileImage", Buffer.from("fake profile image"), {
        filename: "profile.png",
        contentType: "image/png",
      });

    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.body.user.profileImageUrl).toMatch(/\.png$/);

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meResponse.body.user.profileImageUrl).toBe(uploadResponse.body.user.profileImageUrl);

    database.close();
    fs.rmSync(uploadsPath, { recursive: true, force: true });
  });

  it("updates profile details and password for the current user", async () => {
    const { app, database, token } = await createAuthenticatedApp();

    const updateResponse = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        displayName: "New Creator",
        currentPassword: "password123",
        newPassword: "newpassword123",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.user.displayName).toBe("New Creator");

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: updateResponse.body.user.email,
      password: "newpassword123",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.displayName).toBe("New Creator");

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
      .field("description", "A first song for discovery.")
      .attach("audioFile", Buffer.from("fake mp3 data"), {
        filename: "first-signal.mp3",
        contentType: "audio/mpeg",
      })
      .attach("coverImage", Buffer.from("fake image data"), {
        filename: "cover.png",
        contentType: "image/png",
      })
      .attach("slideshowImages", Buffer.from("fake slideshow image 1"), {
        filename: "slide-1.png",
        contentType: "image/png",
      })
      .attach("slideshowImages", Buffer.from("fake slideshow image 2"), {
        filename: "slide-2.webp",
        contentType: "image/webp",
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.song).toMatchObject({
      title: "First Signal",
      artistName: user.displayName,
      description: "A first song for discovery.",
    });
    expect(uploadResponse.body.song.slideshowImageUrls).toHaveLength(2);
    expect(uploadResponse.body.song.backgroundVideoUrl).toBeNull();

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
        description: "Updated description.",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.song).toMatchObject({
      title: "First Signal Updated",
      artistName: "New Artist Name",
      description: "Updated description.",
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

  it("accepts a background video upload", async () => {
    const { app, database, uploadsPath, token, user } = await createAuthenticatedApp();

    const uploadResponse = await request(app)
      .post("/api/songs")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Video Signal")
      .field("artistName", user.displayName)
      .attach("audioFile", Buffer.from("fake mp3 data"), {
        filename: "video-signal.mp3",
        contentType: "audio/mpeg",
      })
      .attach("backgroundVideo", Buffer.from("fake mp4 data"), {
        filename: "canvas.mp4",
        contentType: "video/mp4",
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.song.backgroundVideoUrl).toMatch(/\.mp4$/);
    expect(uploadResponse.body.song.slideshowImageUrls).toHaveLength(0);

    database.close();
    fs.rmSync(uploadsPath, { recursive: true, force: true });
  });
});

describe("discovery endpoints", () => {
  it("searches artists, follows them, shows their page, and returns a random song", async () => {
    const { app, database, uploadsPath, token, user } = await createAuthenticatedApp();

    await request(app)
      .post("/api/songs")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Hidden Frequency")
      .field("artistName", user.displayName)
      .field("description", "A quiet discovery track.")
      .attach("audioFile", Buffer.from("fake discovery mp3"), {
        filename: "hidden-frequency.mp3",
        contentType: "audio/mpeg",
      });

    const searchResponse = await request(app).get("/api/artists/search?q=Creator");

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.artists[0]).toMatchObject({
      id: user.id,
      displayName: user.displayName,
      songCount: 1,
      followerCount: 0,
    });

    const mixedSearchResponse = await request(app).get("/api/search?q=Hidden");

    expect(mixedSearchResponse.status).toBe(200);
    expect(mixedSearchResponse.body.songs[0]).toMatchObject({
      title: "Hidden Frequency",
      artist: {
        id: user.id,
        displayName: user.displayName,
      },
    });
    const discoveredSongId = mixedSearchResponse.body.songs[0].id;

    const likeResponse = await request(app)
      .post(`/api/songs/${discoveredSongId}/like`)
      .set("Authorization", `Bearer ${token}`);

    expect(likeResponse.status).toBe(200);
    expect(likeResponse.body.song.likeCount).toBe(1);
    expect(likeResponse.body.isLiked).toBe(true);

    const unlikeResponse = await request(app)
      .post(`/api/songs/${discoveredSongId}/like`)
      .set("Authorization", `Bearer ${token}`);

    expect(unlikeResponse.status).toBe(200);
    expect(unlikeResponse.body.song.likeCount).toBe(0);
    expect(unlikeResponse.body.isLiked).toBe(false);

    await request(app)
      .post(`/api/songs/${discoveredSongId}/like`)
      .set("Authorization", `Bearer ${token}`);

    const streamResponse = await request(app)
      .post(`/api/songs/${discoveredSongId}/stream`)
      .send({ seconds: 42 });

    expect(streamResponse.status).toBe(200);
    expect(streamResponse.body.song.streamCount).toBe(1);
    expect(streamResponse.body.song.listenSeconds).toBe(42);

    const topSongsResponse = await request(app).get("/api/songs/top");

    expect(topSongsResponse.status).toBe(200);
    expect(topSongsResponse.body.songs[0]).toMatchObject({
      id: discoveredSongId,
      likeCount: 1,
      streamCount: 1,
    });

    const artistResponse = await request(app).get(`/api/artists/${user.id}`);

    expect(artistResponse.status).toBe(200);
    expect(artistResponse.body.songs).toHaveLength(1);
    expect(artistResponse.body.songs[0].title).toBe("Hidden Frequency");

    const listenerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        displayName: "Listener",
        email: `listener-${randomUUID()}@example.com`,
        password: "password123",
      });
    const listenerToken = listenerResponse.body.token;

    const followResponse = await request(app)
      .post(`/api/artists/${user.id}/follow`)
      .set("Authorization", `Bearer ${listenerToken}`);

    expect(followResponse.status).toBe(200);
    expect(followResponse.body.artist).toMatchObject({
      followerCount: 1,
      isFollowing: true,
    });

    const creatorSocialResponse = await request(app)
      .get("/api/profile/social")
      .set("Authorization", `Bearer ${token}`);

    expect(creatorSocialResponse.status).toBe(200);
    expect(creatorSocialResponse.body.followers).toHaveLength(1);
    expect(creatorSocialResponse.body.followers[0].displayName).toBe("Listener");

    const listenerSocialResponse = await request(app)
      .get("/api/profile/social")
      .set("Authorization", `Bearer ${listenerToken}`);

    expect(listenerSocialResponse.status).toBe(200);
    expect(listenerSocialResponse.body.following).toHaveLength(1);
    expect(listenerSocialResponse.body.following[0].displayName).toBe(user.displayName);

    const followedArtistResponse = await request(app)
      .get(`/api/artists/${user.id}`)
      .set("Authorization", `Bearer ${listenerToken}`);

    expect(followedArtistResponse.body.artist.isFollowing).toBe(true);

    const randomResponse = await request(app).get("/api/songs/random");

    expect(randomResponse.status).toBe(200);
    expect(randomResponse.body.song).toMatchObject({
      title: "Hidden Frequency",
      artist: {
        id: user.id,
        displayName: user.displayName,
      },
    });

    const unfollowResponse = await request(app)
      .delete(`/api/artists/${user.id}/follow`)
      .set("Authorization", `Bearer ${listenerToken}`);

    expect(unfollowResponse.status).toBe(200);
    expect(unfollowResponse.body.artist).toMatchObject({
      followerCount: 0,
      isFollowing: false,
    });

    database.close();
    fs.rmSync(uploadsPath, { recursive: true, force: true });
  });
});
