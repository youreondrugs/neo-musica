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
const ACCEPTED_VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);

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
    profileImageUrl: user.profileImageFilePath ? `/uploads/${user.profileImageFilePath}` : null,
  };
}

function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isAcceptedFile(file, acceptedExtensions, acceptedMimePrefix) {
  const extension = path.extname(file.originalname).toLowerCase();

  return acceptedExtensions.has(extension) && file.mimetype.startsWith(acceptedMimePrefix);
}

function serializeSong(song, { isLiked = false } = {}) {
  const artist = song.artist
    ? {
        ...song.artist,
        profileImageUrl: song.artist.profileImageFilePath
          ? `/uploads/${song.artist.profileImageFilePath}`
          : null,
      }
    : null;

  return {
    id: song.id,
    userId: song.userId,
    title: song.title,
    artistName: song.artistName,
    description: song.description,
    likeCount: song.likeCount,
    streamCount: song.streamCount,
    listenSeconds: song.listenSeconds,
    audioUrl: `/uploads/${song.audioFilePath}`,
    coverUrl: song.coverFilePath ? `/uploads/${song.coverFilePath}` : null,
    backgroundVideoUrl: song.backgroundVideoFilePath
      ? `/uploads/${song.backgroundVideoFilePath}`
      : null,
    slideshowImageUrls: song.slideshowImagePaths.map((filePath) => `/uploads/${filePath}`),
    audioOriginalName: song.audioOriginalName,
    coverOriginalName: song.coverOriginalName,
    backgroundVideoOriginalName: song.backgroundVideoOriginalName,
    slideshowImageOriginalNames: song.slideshowImageOriginalNames,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
    artist,
    isLiked,
  };
}

function serializeArtist(artist) {
  return {
    id: artist.id,
    displayName: artist.displayName,
    profileImageUrl: artist.profileImageFilePath ? `/uploads/${artist.profileImageFilePath}` : null,
    songCount: artist.songCount,
    followerCount: artist.followerCount,
    isFollowing: artist.isFollowing,
    isSelf: artist.isSelf,
  };
}

function deleteUploadedFile(uploadsPath, filename) {
  if (!filename) {
    return;
  }

  fs.rm(path.join(uploadsPath, filename), { force: true }, () => {});
}

function deleteUploadedFiles(uploadsPath, filenames) {
  filenames.filter(Boolean).forEach((filename) => deleteUploadedFile(uploadsPath, filename));
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

      if (
        file.fieldname === "profileImage" &&
        isAcceptedFile(file, ACCEPTED_COVER_EXTENSIONS, "image/")
      ) {
        callback(null, true);
        return;
      }

      if (
        file.fieldname === "backgroundVideo" &&
        isAcceptedFile(file, ACCEPTED_VIDEO_EXTENSIONS, "video/")
      ) {
        callback(null, true);
        return;
      }

      if (
        file.fieldname === "slideshowImages" &&
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

  function serializeSongForViewer(song, viewerId = null) {
    return serializeSong(song, {
      isLiked: database.isSongLikedByUser(song.id, viewerId),
    });
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

  app.patch("/api/profile", (request, response, next) => {
    try {
      const user = requireCurrentUser(request);
      const displayName = String(request.body.displayName || "").trim();
      const currentPassword = String(request.body.currentPassword || "");
      const newPassword = String(request.body.newPassword || "");
      const updates = {};

      if (displayName && displayName !== user.displayName) {
        updates.displayName = displayName;
      }

      if (newPassword) {
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
          throw createHttpError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        }

        if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
          throw createHttpError("Current password is incorrect.", 401);
        }

        updates.passwordHash = hashPassword(newPassword);
      }

      const updatedUser = database.updateUserProfile({
        id: user.id,
        displayName: updates.displayName,
        passwordHash: updates.passwordHash,
      });

      response.status(200).json({ user: sanitizeUser(updatedUser) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/artists/search", (request, response, next) => {
    try {
      const viewer = getCurrentUser(request);
      const query = String(request.query.q || "").trim();

      if (!query) {
        return response.status(200).json({ artists: [] });
      }

      const artists = database.searchArtists(query, viewer?.id || null).map(serializeArtist);

      return response.status(200).json({ artists });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/search", (request, response, next) => {
    try {
      const viewer = getCurrentUser(request);
      const query = String(request.query.q || "").trim();

      if (!query) {
        return response.status(200).json({ artists: [], songs: [] });
      }

      const artists = database.searchArtists(query, viewer?.id || null).map(serializeArtist);
      const songs = database
        .searchSongs(query)
        .map((song) => serializeSongForViewer(song, viewer?.id || null));

      return response.status(200).json({ artists, songs });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/artists/:artistId", (request, response, next) => {
    try {
      const viewer = getCurrentUser(request);
      const artist = database.findArtistById(request.params.artistId, viewer?.id || null);

      if (!artist) {
        throw createHttpError("Artist not found.", 404);
      }

      const songs = database
        .listSongsByArtistId(artist.id)
        .map((song) => serializeSongForViewer(song, viewer?.id || null));

      response.status(200).json({
        artist: serializeArtist(artist),
        songs,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/artists/:artistId/follow", (request, response, next) => {
    try {
      const user = requireCurrentUser(request);
      const artist = database.findUserById(request.params.artistId);

      if (!artist) {
        throw createHttpError("Artist not found.", 404);
      }

      if (artist.id === user.id) {
        throw createHttpError("You cannot follow yourself.", 400);
      }

      database.followArtist(user.id, artist.id);

      response.status(200).json({
        artist: serializeArtist(database.findArtistById(artist.id, user.id)),
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/artists/:artistId/follow", (request, response, next) => {
    try {
      const user = requireCurrentUser(request);
      const artist = database.findUserById(request.params.artistId);

      if (!artist) {
        throw createHttpError("Artist not found.", 404);
      }

      database.unfollowArtist(user.id, artist.id);

      response.status(200).json({
        artist: serializeArtist(database.findArtistById(artist.id, user.id)),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/songs/mine", (request, response, next) => {
    try {
      const user = requireCurrentUser(request);
      const songs = database
        .listSongsByUserId(user.id)
        .map((song) => serializeSongForViewer(song, user.id));

      response.status(200).json({
        songs,
        limit: MAX_SONGS_PER_USER,
        remaining: Math.max(MAX_SONGS_PER_USER - songs.length, 0),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/profile/social", (request, response, next) => {
    try {
      const user = requireCurrentUser(request);
      const followers = database.listFollowers(user.id).map(serializeArtist);
      const following = database.listFollowing(user.id).map(serializeArtist);

      response.status(200).json({
        followers,
        following,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/profile/image",
    (request, _response, next) => {
      try {
        request.currentUser = requireCurrentUser(request);
        next();
      } catch (error) {
        next(error);
      }
    },
    upload.single("profileImage"),
    (request, response, next) => {
      try {
        const user = request.currentUser;
        const profileImage = request.file;

        if (!profileImage) {
          throw createHttpError("Profile picture is required.");
        }

        const updatedUser = database.updateUserProfileImage({
          id: user.id,
          profileImageFilePath: profileImage.filename,
          profileImageOriginalName: profileImage.originalname,
        });

        deleteUploadedFile(resolvedUploadsPath, user.profileImageFilePath);

        response.status(200).json({ user: sanitizeUser(updatedUser) });
      } catch (error) {
        deleteUploadedFile(resolvedUploadsPath, request.file?.filename);
        next(error);
      }
    },
  );

  app.get("/api/songs/random", (request, response, next) => {
    try {
      const viewer = getCurrentUser(request);
      const song = database.findRandomSong();

      if (!song) {
        return response.status(200).json({ song: null });
      }

      return response.status(200).json({
        song: serializeSongForViewer(song, viewer?.id || null),
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/songs/top", (request, response, next) => {
    try {
      const viewer = getCurrentUser(request);
      const songs = database
        .listTopSongs()
        .map((song) => serializeSongForViewer(song, viewer?.id || null));

      response.status(200).json({ songs });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/songs/:songId/like", (request, response, next) => {
    try {
      const user = requireCurrentUser(request);
      const { song, isLiked } = database.toggleSongLike(request.params.songId, user.id);

      if (!song) {
        throw createHttpError("Song not found.", 404);
      }

      response.status(200).json({
        song: serializeSong(song, { isLiked }),
        isLiked,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/songs/:songId/stream", (request, response, next) => {
    try {
      const viewer = getCurrentUser(request);
      const song = database.recordSongStream({
        id: request.params.songId,
        seconds: request.body.seconds,
      });

      if (!song) {
        throw createHttpError("Song not found.", 404);
      }

      response.status(200).json({
        song: serializeSongForViewer(song, viewer?.id || null),
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
      { name: "backgroundVideo", maxCount: 1 },
      { name: "slideshowImages", maxCount: 5 },
    ]),
    (request, response, next) => {
      try {
        const user = request.currentUser;
        const title = String(request.body.title || "").trim();
        const artistName = user.displayName;
        const description = String(request.body.description || "").trim();
        const audioFile = request.files?.audioFile?.[0];
        const coverImage = request.files?.coverImage?.[0];
        const backgroundVideo = request.files?.backgroundVideo?.[0];
        const slideshowImages = request.files?.slideshowImages || [];
        const uploadedFilenames = [
          audioFile?.filename,
          coverImage?.filename,
          backgroundVideo?.filename,
          ...slideshowImages.map((file) => file.filename),
        ];

        if (database.countSongsForUser(user.id) >= MAX_SONGS_PER_USER) {
          deleteUploadedFiles(resolvedUploadsPath, uploadedFilenames);
          throw createHttpError(
            "You can upload up to 10 songs. Delete one before adding more.",
            409,
          );
        }

        if (!title) {
          deleteUploadedFiles(resolvedUploadsPath, uploadedFilenames);
          throw createHttpError("Song title is required.");
        }

        if (!audioFile) {
          deleteUploadedFiles(resolvedUploadsPath, uploadedFilenames);
          throw createHttpError("Audio file is required.");
        }

        if (backgroundVideo && slideshowImages.length > 0) {
          deleteUploadedFiles(resolvedUploadsPath, uploadedFilenames);
          throw createHttpError("Choose either a background video or slideshow photos, not both.");
        }

        const song = database.createSong({
          id: randomUUID(),
          userId: user.id,
          title,
          artistName,
          description,
          audioFilePath: audioFile.filename,
          coverFilePath: coverImage?.filename || null,
          backgroundVideoFilePath: backgroundVideo?.filename || null,
          backgroundVideoOriginalName: backgroundVideo?.originalname || null,
          slideshowImagePaths: slideshowImages.map((file) => file.filename),
          slideshowImageOriginalNames: slideshowImages.map((file) => file.originalname),
          audioOriginalName: audioFile.originalname,
          coverOriginalName: coverImage?.originalname || null,
        });

        response.status(201).json({ song: serializeSongForViewer(song, user.id) });
      } catch (error) {
        next(error);
      }
    },
  );

  app.patch(
    "/api/songs/:songId",
    (request, _response, next) => {
      try {
        request.currentUser = requireCurrentUser(request);
        next();
      } catch (error) {
        next(error);
      }
    },
    upload.fields([
      { name: "coverImage", maxCount: 1 },
      { name: "backgroundVideo", maxCount: 1 },
      { name: "slideshowImages", maxCount: 5 },
    ]),
    (request, response, next) => {
      const uploadedFilenames = [
        request.files?.coverImage?.[0]?.filename,
        request.files?.backgroundVideo?.[0]?.filename,
        ...(request.files?.slideshowImages || []).map((file) => file.filename),
      ];

      try {
        const user = request.currentUser;
        const existingSong = database.findSongByIdAndUserId(request.params.songId, user.id);

        if (!existingSong) {
          deleteUploadedFiles(resolvedUploadsPath, uploadedFilenames);
          throw createHttpError("Song not found.", 404);
        }

        const title = String(request.body.title || "").trim();
        const coverImage = request.files?.coverImage?.[0];
        const backgroundVideo = request.files?.backgroundVideo?.[0];
        const slideshowImages = request.files?.slideshowImages || [];

        if (!title) {
          deleteUploadedFiles(resolvedUploadsPath, uploadedFilenames);
          throw createHttpError("Song title is required.");
        }

        if (backgroundVideo && slideshowImages.length > 0) {
          deleteUploadedFiles(resolvedUploadsPath, uploadedFilenames);
          throw createHttpError("Choose either a background video or slideshow photos, not both.");
        }

        const nextCoverFilePath = coverImage?.filename || existingSong.coverFilePath;
        const nextCoverOriginalName = coverImage?.originalname || existingSong.coverOriginalName;
        const nextBackgroundVideoFilePath = backgroundVideo
          ? backgroundVideo.filename
          : slideshowImages.length > 0
            ? null
            : existingSong.backgroundVideoFilePath;
        const nextBackgroundVideoOriginalName = backgroundVideo
          ? backgroundVideo.originalname
          : slideshowImages.length > 0
            ? null
            : existingSong.backgroundVideoOriginalName;
        const nextSlideshowImagePaths = backgroundVideo
          ? []
          : slideshowImages.length > 0
            ? slideshowImages.map((file) => file.filename)
            : existingSong.slideshowImagePaths;
        const nextSlideshowImageOriginalNames = backgroundVideo
          ? []
          : slideshowImages.length > 0
            ? slideshowImages.map((file) => file.originalname)
            : existingSong.slideshowImageOriginalNames;

        const song = database.updateSong({
          id: existingSong.id,
          userId: user.id,
          title,
          artistName: user.displayName,
          description: String(request.body.description || "").trim(),
          coverFilePath: nextCoverFilePath,
          coverOriginalName: nextCoverOriginalName,
          backgroundVideoFilePath: nextBackgroundVideoFilePath,
          backgroundVideoOriginalName: nextBackgroundVideoOriginalName,
          slideshowImagePaths: nextSlideshowImagePaths,
          slideshowImageOriginalNames: nextSlideshowImageOriginalNames,
        });

        if (coverImage) {
          deleteUploadedFile(resolvedUploadsPath, existingSong.coverFilePath);
        }

        if (backgroundVideo || slideshowImages.length > 0) {
          deleteUploadedFile(resolvedUploadsPath, existingSong.backgroundVideoFilePath);
          deleteUploadedFiles(resolvedUploadsPath, existingSong.slideshowImagePaths);
        }

        response.status(200).json({ song: serializeSongForViewer(song, user.id) });
      } catch (error) {
        deleteUploadedFiles(resolvedUploadsPath, uploadedFilenames);
        next(error);
      }
    },
  );

  app.delete("/api/songs/:songId", (request, response, next) => {
    try {
      const user = requireCurrentUser(request);
      const deletedSong = database.deleteSong(request.params.songId, user.id);

      if (!deletedSong) {
        throw createHttpError("Song not found.", 404);
      }

      deleteUploadedFile(resolvedUploadsPath, deletedSong.audioFilePath);
      deleteUploadedFile(resolvedUploadsPath, deletedSong.coverFilePath);
      deleteUploadedFile(resolvedUploadsPath, deletedSong.backgroundVideoFilePath);
      deleteUploadedFiles(resolvedUploadsPath, deletedSong.slideshowImagePaths);

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_UNEXPECTED_FILE"
          ? "This file input is not accepted by the running server. Restart the backend and try again."
          : error.message;

      return response.status(400).json({ message });
    }

    response.status(error.status || 500).json({
      message: error.message || "Something went wrong.",
    });
  });

  return app;
}
