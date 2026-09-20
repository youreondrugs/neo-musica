import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import cors from "cors";
import express from "express";

const PASSWORD_KEY_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 8;

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

function createAuthError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function createApp() {
  const app = express();
  const usersByEmail = new Map();
  const sessionsByToken = new Map();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "neo-musica-api",
    });
  });

  function createSession(userId) {
    const token = randomBytes(32).toString("hex");
    sessionsByToken.set(token, userId);

    return token;
  }

  function getCurrentUser(request) {
    const authorization = request.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return null;
    }

    const userId = sessionsByToken.get(token);

    if (!userId) {
      return null;
    }

    return [...usersByEmail.values()].find((user) => user.id === userId) || null;
  }

  app.post("/api/auth/register", (request, response, next) => {
    try {
      const displayName = String(request.body.displayName || "").trim();
      const email = normalizeEmail(request.body.email);
      const password = String(request.body.password || "");

      if (!displayName) {
        throw createAuthError("Display name is required.");
      }

      if (!email || !email.includes("@")) {
        throw createAuthError("A valid email is required.");
      }

      if (password.length < MIN_PASSWORD_LENGTH) {
        throw createAuthError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }

      if (usersByEmail.has(email)) {
        throw createAuthError("An account already exists for that email.", 409);
      }

      const user = {
        id: randomUUID(),
        displayName,
        email,
        passwordHash: hashPassword(password),
      };

      usersByEmail.set(email, user);

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
      const user = usersByEmail.get(email);

      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw createAuthError("Email or password is incorrect.", 401);
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
      sessionsByToken.delete(token);
    }

    response.status(204).send();
  });

  app.use((error, _request, response, _next) => {
    response.status(error.status || 500).json({
      message: error.message || "Something went wrong.",
    });
  });

  return app;
}
