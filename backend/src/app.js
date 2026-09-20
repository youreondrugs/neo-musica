import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import multer from "multer";

const PASSWORD_KEY_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 8;
const SESSION_DURATION_DAYS = 7;
const MAX_SONGS_PER_USER = 10;
const MAX_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024;
const ACCEPTED_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a"]);
const ACCEPTED_COVER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");

  return `${salt}:${hash}`;
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function verifyPassword(password, storedPassword) {
  const [salt, storedHash] = storedPassword.split(":");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  return storedHashBuffer.length === hash.length && timingSafeEqual(storedHashBuffer, hash);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
  };
}

function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseTags(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 8)
    .map((tag) => `#${tag.toLowerCase()}`);
}

function isAcceptedFile(file, acceptedExtensions, acceptedMimePrefix) {
  const extension = path.extname(file.originalname).toLowerCase();

  return acceptedExtensions.has(extension) && file.mimetype.startsWith(acceptedMimePrefix);
}

function serializeSong(song) {
  return {
    id: song.id,
    title: song.title,
    artistName: song.artistName,
    tags: song.tags,
    audioUrl: `/uploads/${song.audioFilePath}`,
    coverUrl: song.coverFilePath ? `/uploads/${song.coverFilePath}` : null,
    audioOriginalName: song.audioOriginalName,
    coverOriginalName: song.coverOriginalName,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
  };
}

function deleteUploadedFile(uploadsPath, filename) {
  if (!filename) {
    return;
  }

  fs.rm(path.join(uploadsPath, filename), { force: true }, () => {});
}

export function createApp({ database, uploadsPath }) {
  const app = express();
  const resolvedUploadsPath = uploadsPath || path.resolve(process.cwd(), "uploads");
  fs.mkdirSync(resolvedUploadsPath, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_request, _file, callback) => {
        callback(null, resolvedUploadsPath);
      },
      filename: (_request, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        callback(null, `${randomUUID()}${extension}`);
      },
    }),
    limits: {
      fileSize: MAX_UPLOAD_SIZE_BYTES,
    },
    fileFilter: (_request, file, callback) => {
      if (
        file.fieldname === "audioFile" &&
        isAcceptedFile(file, ACCEPTED_AUDIO_EXTENSIONS, "audio/")
      ) {
        callback(null, true);
        return;
      }

      if (
        file.fieldname === "coverImage" &&
        isAcceptedFile(file, ACCEPTED_COVER_EXTENSIONS, "image/")
      ) {
        callback(null, true);
        return;
      }

      callback(createHttpError("Unsupported file type.", 400));
    },
  });

  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(resolvedUploadsPath));

  app.get("/api/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "neo-musica-api",
    });
  });

  function createSession(userId) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    database.createSession({
      id: randomUUID(),
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    });

    return token;
  }

  function getCurrentUser(request) {
    const authorization = request.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return null;
    }

    return database.findUserBySessionTokenHash(hashSessionToken(token), new Date().toISOString());
  }

  function requireCurrentUser(request) {
    const user = getCurrentUser(request);

    if (!user) {
      throw createHttpError("You need to login first.", 401);
    }

    return user;
  }

  app.post("/api/auth/register", (request, response, next) => {
    try {
      const displayName = String(request.body.displayName || "").trim();
      const email = normalizeEmail(request.body.email);
      const password = String(request.body.password || "");

      if (!displayName) {
        throw createHttpError("Display name is required.");
      }

      if (!email || !email.includes("@")) {
        throw createHttpError("A valid email is required.");
      }

      if (password.length < MIN_PASSWORD_LENGTH) {
        throw createHttpError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }

      if (database.findUserByEmail(email)) {
        throw createHttpError("An account already exists for that email.", 409);
      }

      const user = database.createUser({
        id: randomUUID(),
        displayName,
        email,
        passwordHash: hashPassword(password),
      });

      response.status(201).json({
        token: createSession(user.id),
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", (request, response, next) => {
    try {
      const email = normalizeEmail(request.body.email);
      const password = String(request.body.password || "");
      const user = database.findUserByEmail(email);

      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw createHttpError("Email or password is incorrect.", 401);
      }

      response.status(200).json({
        token: createSession(user.id),
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/me", (request, response) => {
    const user = getCurrentUser(request);

    if (!user) {
      return response.status(401).json({ message: "You are not signed in." });
    }

    return response.status(200).json({ user: sanitizeUser(user) });
  });

  app.post("/api/auth/logout", (request, response) => {
    const authorization = request.get("authorization") || "";
    const [, token] = authorization.split(" ");

    if (token) {
      database.deleteSessionByTokenHash(hashSessionToken(token));
    }

    response.status(204).send();
  });

  app.get("/api/songs/mine", (request, response, next) => {
    try {
      const user = requireCurrentUser(request);
      const songs = database.listSongsByUserId(user.id).map(serializeSong);

      response.status(200).json({
        songs,
        limit: MAX_SONGS_PER_USER,
        remaining: Math.max(MAX_SONGS_PER_USER - songs.length, 0),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/songs",
    (request, _response, next) => {
      try {
        request.currentUser = requireCurrentUser(request);
        next();
      } catch (error) {
        next(error);
      }
    },
    upload.fields([
      { name: "audioFile", maxCount: 1 },
      { name: "coverImage", maxCount: 1 },
    ]),
    (request, response, next) => {
      try {
        const user = request.currentUser;
        const title = String(request.body.title || "").trim();
        const artistName = String(request.body.artistName || user.displayName).trim();
        const tags = parseTags(request.body.tags);
        const audioFile = request.files?.audioFile?.[0];
        const coverImage = request.files?.coverImage?.[0];

        if (database.countSongsForUser(user.id) >= MAX_SONGS_PER_USER) {
          deleteUploadedFile(resolvedUploadsPath, audioFile?.filename);
          deleteUploadedFile(resolvedUploadsPath, coverImage?.filename);
          throw createHttpError(
            "You can upload up to 10 songs. Delete one before adding more.",
            409,
          );
        }

        if (!title) {
          deleteUploadedFile(resolvedUploadsPath, audioFile?.filename);
          deleteUploadedFile(resolvedUploadsPath, coverImage?.filename);
          throw createHttpError("Song title is required.");
        }

        if (!artistName) {
          deleteUploadedFile(resolvedUploadsPath, audioFile?.filename);
          deleteUploadedFile(resolvedUploadsPath, coverImage?.filename);
          throw createHttpError("Artist name is required.");
        }

        if (!audioFile) {
          deleteUploadedFile(resolvedUploadsPath, coverImage?.filename);
          throw createHttpError("Audio file is required.");
        }

        const song = database.createSong({
          id: randomUUID(),
          userId: user.id,
          title,
          artistName,
          tags,
          audioFilePath: audioFile.filename,
          coverFilePath: coverImage?.filename || null,
          audioOriginalName: audioFile.originalname,
          coverOriginalName: coverImage?.originalname || null,
        });

        response.status(201).json({ song: serializeSong(song) });
      } catch (error) {
        next(error);
      }
    },
  );

  app.patch("/api/songs/:songId", (request, response, next) => {
    try {
      const user = requireCurrentUser(request);
      const existingSong = database.findSongByIdAndUserId(request.params.songId, user.id);

      if (!existingSong) {
        throw createHttpError("Song not found.", 404);
      }

      const title = String(request.body.title || "").trim();
      const artistName = String(request.body.artistName || "").trim();

      if (!title) {
        throw createHttpError("Song title is required.");
      }

      if (!artistName) {
        throw createHttpError("Artist name is required.");
      }

      const song = database.updateSong({
        id: existingSong.id,
        userId: user.id,
        title,
        artistName,
        tags: parseTags(request.body.tags),
      });

      response.status(200).json({ song: serializeSong(song) });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/songs/:songId", (request, response, next) => {
    try {
      const user = requireCurrentUser(request);
      const deletedSong = database.deleteSong(request.params.songId, user.id);

      if (!deletedSong) {
        throw createHttpError("Song not found.", 404);
      }

      deleteUploadedFile(resolvedUploadsPath, deletedSong.audioFilePath);
      deleteUploadedFile(resolvedUploadsPath, deletedSong.coverFilePath);

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _request, response, _next) => {
    response.status(error.status || 500).json({
      message: error.message || "Something went wrong.",
    });
  });

  return app;
}
