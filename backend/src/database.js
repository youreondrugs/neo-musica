import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";

const require = createRequire(import.meta.url);

let sqlModulePromise;

function getSqlModule() {
  sqlModulePromise ??= initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  });

  return sqlModulePromise;
}

function toUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    passwordHash: row.password_hash,
    profileImageFilePath: row.profile_image_file_path,
    profileImageOriginalName: row.profile_image_original_name,
    createdAt: row.created_at,
  };
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toSong(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    artistName: row.artist_name,
    description: row.description || "",
    audioFilePath: row.audio_file_path,
    coverFilePath: row.cover_file_path,
    likeCount: Number(row.like_count || 0),
    streamCount: Number(row.stream_count || 0),
    listenSeconds: Number(row.listen_seconds || 0),
    backgroundVideoFilePath: row.background_video_file_path,
    slideshowImagePaths: parseJsonArray(row.slideshow_image_paths),
    audioOriginalName: row.audio_original_name,
    coverOriginalName: row.cover_original_name,
    backgroundVideoOriginalName: row.background_video_original_name,
    slideshowImageOriginalNames: parseJsonArray(row.slideshow_image_original_names),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toArtist(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    displayName: row.display_name,
    profileImageFilePath: row.profile_image_file_path,
    profileImageOriginalName: row.profile_image_original_name,
    createdAt: row.created_at,
    songCount: Number(row.song_count || 0),
    followerCount: Number(row.follower_count || 0),
    isFollowing: Boolean(row.is_following),
    isSelf: Boolean(row.is_self),
  };
}

function toSongWithArtist(row) {
  const song = toSong(row);

  if (!song) {
    return null;
  }

  return {
    ...song,
    artist: {
      id: row.artist_id || row.user_id,
      displayName: row.artist_display_name,
      profileImageFilePath: row.artist_profile_image_file_path,
    },
  };
}

function getFirstRow(database, sql, params = {}) {
  const statement = database.prepare(sql);

  try {
    statement.bind(params);

    if (!statement.step()) {
      return null;
    }

    return statement.getAsObject();
  } finally {
    statement.free();
  }
}

function run(database, sql, params = {}) {
  const statement = database.prepare(sql);

  try {
    statement.run(params);
  } finally {
    statement.free();
  }
}

function getRows(database, sql, params = {}) {
  const statement = database.prepare(sql);
  const rows = [];

  try {
    statement.bind(params);

    while (statement.step()) {
      rows.push(statement.getAsObject());
    }

    return rows;
  } finally {
    statement.free();
  }
}

function hasColumn(database, tableName, columnName) {
  return getRows(database, `PRAGMA table_info(${tableName})`).some(
    (column) => column.name === columnName,
  );
}

export async function createDatabase({ databasePath } = {}) {
  const SQL = await getSqlModule();
  const database =
    databasePath && fs.existsSync(databasePath)
      ? new SQL.Database(fs.readFileSync(databasePath))
      : new SQL.Database();

  function persist() {
    if (!databasePath) {
      return;
    }

    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.writeFileSync(databasePath, database.export());
  }

  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      profile_image_file_path TEXT,
      profile_image_original_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS sessions_token_hash_index ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS sessions_user_id_index ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      audio_file_path TEXT NOT NULL,
      cover_file_path TEXT,
      like_count INTEGER NOT NULL DEFAULT 0,
      stream_count INTEGER NOT NULL DEFAULT 0,
      listen_seconds INTEGER NOT NULL DEFAULT 0,
      background_video_file_path TEXT,
      background_video_original_name TEXT,
      slideshow_image_paths TEXT NOT NULL DEFAULT '[]',
      slideshow_image_original_names TEXT NOT NULL DEFAULT '[]',
      audio_original_name TEXT NOT NULL,
      cover_original_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS songs_user_id_index ON songs(user_id);

    CREATE TABLE IF NOT EXISTS follows (
      follower_user_id TEXT NOT NULL,
      followed_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_user_id, followed_user_id),
      FOREIGN KEY (follower_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (followed_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS follows_followed_user_id_index
      ON follows(followed_user_id);

    CREATE TABLE IF NOT EXISTS song_likes (
      song_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (song_id, user_id),
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS song_likes_user_id_index
      ON song_likes(user_id);
  `);

  if (!hasColumn(database, "songs", "description")) {
    database.exec("ALTER TABLE songs ADD COLUMN description TEXT NOT NULL DEFAULT '';");
  }

  if (!hasColumn(database, "users", "profile_image_file_path")) {
    database.exec("ALTER TABLE users ADD COLUMN profile_image_file_path TEXT;");
  }

  if (!hasColumn(database, "users", "profile_image_original_name")) {
    database.exec("ALTER TABLE users ADD COLUMN profile_image_original_name TEXT;");
  }

  if (!hasColumn(database, "songs", "like_count")) {
    database.exec("ALTER TABLE songs ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;");
  }

  if (!hasColumn(database, "songs", "stream_count")) {
    database.exec("ALTER TABLE songs ADD COLUMN stream_count INTEGER NOT NULL DEFAULT 0;");
  }

  if (!hasColumn(database, "songs", "listen_seconds")) {
    database.exec("ALTER TABLE songs ADD COLUMN listen_seconds INTEGER NOT NULL DEFAULT 0;");
  }

  if (!hasColumn(database, "songs", "background_video_file_path")) {
    database.exec("ALTER TABLE songs ADD COLUMN background_video_file_path TEXT;");
  }

  if (!hasColumn(database, "songs", "background_video_original_name")) {
    database.exec("ALTER TABLE songs ADD COLUMN background_video_original_name TEXT;");
  }

  if (!hasColumn(database, "songs", "slideshow_image_paths")) {
    database.exec("ALTER TABLE songs ADD COLUMN slideshow_image_paths TEXT NOT NULL DEFAULT '[]';");
  }

  if (!hasColumn(database, "songs", "slideshow_image_original_names")) {
    database.exec(
      "ALTER TABLE songs ADD COLUMN slideshow_image_original_names TEXT NOT NULL DEFAULT '[]';",
    );
  }

  persist();

  return {
    createUser({ id, displayName, email, passwordHash }) {
      run(
        database,
        `
          INSERT INTO users (id, display_name, email, password_hash)
          VALUES ($id, $displayName, $email, $passwordHash)
        `,
        {
          $id: id,
          $displayName: displayName,
          $email: email,
          $passwordHash: passwordHash,
        },
      );
      persist();

      return this.findUserByEmail(email);
    },

    findUserByEmail(email) {
      return toUser(
        getFirstRow(
          database,
          `
            SELECT id, display_name, email, password_hash, profile_image_file_path,
              profile_image_original_name, created_at
            FROM users
            WHERE email = $email
          `,
          { $email: email },
        ),
      );
    },

    findUserById(id) {
      return toUser(
        getFirstRow(
          database,
          `
            SELECT id, display_name, email, password_hash, profile_image_file_path,
              profile_image_original_name, created_at
            FROM users
            WHERE id = $id
          `,
          { $id: id },
        ),
      );
    },

    updateUserProfileImage({ id, profileImageFilePath, profileImageOriginalName }) {
      run(
        database,
        `
          UPDATE users
          SET profile_image_file_path = $profileImageFilePath,
            profile_image_original_name = $profileImageOriginalName
          WHERE id = $id
        `,
        {
          $id: id,
          $profileImageFilePath: profileImageFilePath,
          $profileImageOriginalName: profileImageOriginalName,
        },
      );
      persist();

      return this.findUserById(id);
    },

    updateUserProfile({ id, displayName, passwordHash }) {
      const assignments = [];
      const params = { $id: id };

      if (displayName) {
        assignments.push("display_name = $displayName");
        params.$displayName = displayName;
      }

      if (passwordHash) {
        assignments.push("password_hash = $passwordHash");
        params.$passwordHash = passwordHash;
      }

      if (assignments.length === 0) {
        return this.findUserById(id);
      }

      run(
        database,
        `
          UPDATE users
          SET ${assignments.join(", ")}
          WHERE id = $id
        `,
        params,
      );
      persist();

      return this.findUserById(id);
    },

    findUserBySessionTokenHash(tokenHash, now) {
      return toUser(
        getFirstRow(
          database,
          `
            SELECT users.id, users.display_name, users.email, users.password_hash,
              users.profile_image_file_path, users.profile_image_original_name, users.created_at
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = $tokenHash
              AND sessions.expires_at > $now
          `,
          {
            $tokenHash: tokenHash,
            $now: now,
          },
        ),
      );
    },

    createSession({ id, userId, tokenHash, expiresAt }) {
      run(
        database,
        `
          INSERT INTO sessions (id, user_id, token_hash, expires_at)
          VALUES ($id, $userId, $tokenHash, $expiresAt)
        `,
        {
          $id: id,
          $userId: userId,
          $tokenHash: tokenHash,
          $expiresAt: expiresAt,
        },
      );
      persist();
    },

    deleteSessionByTokenHash(tokenHash) {
      run(database, "DELETE FROM sessions WHERE token_hash = $tokenHash", {
        $tokenHash: tokenHash,
      });
      persist();
    },

    countSongsForUser(userId) {
      const row = getFirstRow(
        database,
        "SELECT COUNT(*) AS count FROM songs WHERE user_id = $userId",
        {
          $userId: userId,
        },
      );

      return Number(row?.count || 0);
    },

    listSongsByUserId(userId) {
      return getRows(
        database,
        `
          SELECT id, user_id, title, artist_name, description, audio_file_path, cover_file_path,
            like_count, stream_count, listen_seconds, background_video_file_path,
            background_video_original_name, slideshow_image_paths, slideshow_image_original_names,
            audio_original_name, cover_original_name, created_at, updated_at
          FROM songs
          WHERE user_id = $userId
          ORDER BY created_at DESC
        `,
        { $userId: userId },
      ).map(toSong);
    },

    listSongsByArtistId(userId) {
      return getRows(
        database,
        `
          SELECT id, user_id, title, artist_name, description, audio_file_path, cover_file_path,
            like_count, stream_count, listen_seconds, background_video_file_path,
            background_video_original_name, slideshow_image_paths, slideshow_image_original_names,
            audio_original_name, cover_original_name, created_at, updated_at
          FROM songs
          WHERE user_id = $userId
          ORDER BY created_at DESC
        `,
        { $userId: userId },
      ).map(toSong);
    },

    searchArtists(query, viewerId = null) {
      return getRows(
        database,
        `
          SELECT users.id, users.display_name, users.profile_image_file_path,
            users.profile_image_original_name, users.created_at,
            COUNT(DISTINCT songs.id) AS song_count,
            COUNT(DISTINCT followers.follower_user_id) AS follower_count,
            MAX(CASE WHEN viewer_follow.follower_user_id IS NULL THEN 0 ELSE 1 END) AS is_following,
            CASE WHEN users.id = $viewerId THEN 1 ELSE 0 END AS is_self
          FROM users
          LEFT JOIN songs ON songs.user_id = users.id
          LEFT JOIN follows AS followers ON followers.followed_user_id = users.id
          LEFT JOIN follows AS viewer_follow
            ON viewer_follow.followed_user_id = users.id
            AND viewer_follow.follower_user_id = $viewerId
          WHERE lower(users.display_name) LIKE lower($query)
          GROUP BY users.id
          ORDER BY song_count DESC, follower_count DESC, users.display_name ASC
          LIMIT 12
        `,
        {
          $query: `%${query}%`,
          $viewerId: viewerId,
        },
      ).map(toArtist);
    },

    searchSongs(query) {
      return getRows(
        database,
        `
          SELECT songs.id, songs.user_id, songs.title, songs.artist_name, songs.description,
            songs.audio_file_path, songs.cover_file_path, songs.like_count, songs.stream_count,
            songs.listen_seconds, songs.background_video_file_path,
            songs.background_video_original_name, songs.slideshow_image_paths,
            songs.slideshow_image_original_names, songs.audio_original_name,
            songs.cover_original_name, songs.created_at, songs.updated_at,
            users.id AS artist_id, users.display_name AS artist_display_name,
            users.profile_image_file_path AS artist_profile_image_file_path
          FROM songs
          JOIN users ON users.id = songs.user_id
          WHERE lower(songs.title) LIKE lower($query)
            OR lower(songs.artist_name) LIKE lower($query)
            OR lower(users.display_name) LIKE lower($query)
          ORDER BY songs.created_at DESC
          LIMIT 12
        `,
        { $query: `%${query}%` },
      ).map(toSongWithArtist);
    },

    findArtistById(id, viewerId = null) {
      return toArtist(
        getFirstRow(
          database,
          `
            SELECT users.id, users.display_name, users.profile_image_file_path,
              users.profile_image_original_name, users.created_at,
              COUNT(DISTINCT songs.id) AS song_count,
              COUNT(DISTINCT followers.follower_user_id) AS follower_count,
              MAX(CASE WHEN viewer_follow.follower_user_id IS NULL THEN 0 ELSE 1 END) AS is_following,
              CASE WHEN users.id = $viewerId THEN 1 ELSE 0 END AS is_self
            FROM users
            LEFT JOIN songs ON songs.user_id = users.id
            LEFT JOIN follows AS followers ON followers.followed_user_id = users.id
            LEFT JOIN follows AS viewer_follow
              ON viewer_follow.followed_user_id = users.id
              AND viewer_follow.follower_user_id = $viewerId
            WHERE users.id = $id
            GROUP BY users.id
          `,
          {
            $id: id,
            $viewerId: viewerId,
          },
        ),
      );
    },

    followArtist(followerUserId, followedUserId) {
      run(
        database,
        `
          INSERT OR IGNORE INTO follows (follower_user_id, followed_user_id)
          VALUES ($followerUserId, $followedUserId)
        `,
        {
          $followerUserId: followerUserId,
          $followedUserId: followedUserId,
        },
      );
      persist();
    },

    unfollowArtist(followerUserId, followedUserId) {
      run(
        database,
        `
          DELETE FROM follows
          WHERE follower_user_id = $followerUserId
            AND followed_user_id = $followedUserId
        `,
        {
          $followerUserId: followerUserId,
          $followedUserId: followedUserId,
        },
      );
      persist();
    },

    listFollowers(userId) {
      return getRows(
        database,
        `
          SELECT users.id, users.display_name, users.profile_image_file_path,
            users.profile_image_original_name, users.created_at,
            COUNT(DISTINCT songs.id) AS song_count,
            COUNT(DISTINCT followers.follower_user_id) AS follower_count,
            MAX(CASE WHEN viewer_follow.follower_user_id IS NULL THEN 0 ELSE 1 END) AS is_following,
            CASE WHEN users.id = $userId THEN 1 ELSE 0 END AS is_self
          FROM follows AS profile_followers
          JOIN users ON users.id = profile_followers.follower_user_id
          LEFT JOIN songs ON songs.user_id = users.id
          LEFT JOIN follows AS followers ON followers.followed_user_id = users.id
          LEFT JOIN follows AS viewer_follow
            ON viewer_follow.followed_user_id = users.id
            AND viewer_follow.follower_user_id = $userId
          WHERE profile_followers.followed_user_id = $userId
          GROUP BY users.id
          ORDER BY users.display_name ASC
        `,
        { $userId: userId },
      ).map(toArtist);
    },

    listFollowing(userId) {
      return getRows(
        database,
        `
          SELECT users.id, users.display_name, users.profile_image_file_path,
            users.profile_image_original_name, users.created_at,
            COUNT(DISTINCT songs.id) AS song_count,
            COUNT(DISTINCT followers.follower_user_id) AS follower_count,
            1 AS is_following,
            CASE WHEN users.id = $userId THEN 1 ELSE 0 END AS is_self
          FROM follows AS profile_following
          JOIN users ON users.id = profile_following.followed_user_id
          LEFT JOIN songs ON songs.user_id = users.id
          LEFT JOIN follows AS followers ON followers.followed_user_id = users.id
          WHERE profile_following.follower_user_id = $userId
          GROUP BY users.id
          ORDER BY users.display_name ASC
        `,
        { $userId: userId },
      ).map(toArtist);
    },

    findRandomSong() {
      return toSongWithArtist(
        getFirstRow(
          database,
          `
            SELECT songs.id, songs.user_id, songs.title, songs.artist_name, songs.description,
              songs.audio_file_path, songs.cover_file_path, songs.like_count, songs.stream_count,
              songs.listen_seconds, songs.background_video_file_path,
              songs.background_video_original_name, songs.slideshow_image_paths,
              songs.slideshow_image_original_names, songs.audio_original_name,
              songs.cover_original_name, songs.created_at, songs.updated_at,
              users.id AS artist_id, users.display_name AS artist_display_name,
              users.profile_image_file_path AS artist_profile_image_file_path
            FROM songs
            JOIN users ON users.id = songs.user_id
            ORDER BY RANDOM()
            LIMIT 1
          `,
        ),
      );
    },

    findSongByIdAndUserId(id, userId) {
      return toSong(
        getFirstRow(
          database,
          `
            SELECT id, user_id, title, artist_name, description, audio_file_path, cover_file_path,
              like_count, stream_count, listen_seconds, background_video_file_path,
              background_video_original_name, slideshow_image_paths, slideshow_image_original_names,
              audio_original_name, cover_original_name, created_at, updated_at
            FROM songs
            WHERE id = $id AND user_id = $userId
          `,
          { $id: id, $userId: userId },
        ),
      );
    },

    createSong({
      id,
      userId,
      title,
      artistName,
      description,
      audioFilePath,
      coverFilePath,
      backgroundVideoFilePath,
      backgroundVideoOriginalName,
      slideshowImagePaths,
      slideshowImageOriginalNames,
      audioOriginalName,
      coverOriginalName,
    }) {
      run(
        database,
        `
          INSERT INTO songs (
            id, user_id, title, artist_name, description, audio_file_path, cover_file_path,
            background_video_file_path, background_video_original_name, slideshow_image_paths,
            slideshow_image_original_names, audio_original_name, cover_original_name
          )
          VALUES (
            $id, $userId, $title, $artistName, $description, $audioFilePath, $coverFilePath,
            $backgroundVideoFilePath, $backgroundVideoOriginalName, $slideshowImagePaths,
            $slideshowImageOriginalNames, $audioOriginalName, $coverOriginalName
          )
        `,
        {
          $id: id,
          $userId: userId,
          $title: title,
          $artistName: artistName,
          $description: description,
          $audioFilePath: audioFilePath,
          $coverFilePath: coverFilePath,
          $backgroundVideoFilePath: backgroundVideoFilePath,
          $backgroundVideoOriginalName: backgroundVideoOriginalName,
          $slideshowImagePaths: JSON.stringify(slideshowImagePaths || []),
          $slideshowImageOriginalNames: JSON.stringify(slideshowImageOriginalNames || []),
          $audioOriginalName: audioOriginalName,
          $coverOriginalName: coverOriginalName,
        },
      );
      persist();

      return this.findSongByIdAndUserId(id, userId);
    },

    updateSong({ id, userId, title, artistName, description }) {
      run(
        database,
        `
          UPDATE songs
          SET title = $title,
            artist_name = $artistName,
            description = $description,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $id AND user_id = $userId
        `,
        {
          $id: id,
          $userId: userId,
          $title: title,
          $artistName: artistName,
          $description: description,
        },
      );
      persist();

      return this.findSongByIdAndUserId(id, userId);
    },

    findSongById(id) {
      return toSongWithArtist(
        getFirstRow(
          database,
          `
            SELECT songs.id, songs.user_id, songs.title, songs.artist_name, songs.description,
              songs.audio_file_path, songs.cover_file_path, songs.like_count, songs.stream_count,
              songs.listen_seconds, songs.background_video_file_path,
              songs.background_video_original_name, songs.slideshow_image_paths,
              songs.slideshow_image_original_names, songs.audio_original_name,
              songs.cover_original_name, songs.created_at, songs.updated_at,
              users.id AS artist_id, users.display_name AS artist_display_name,
              users.profile_image_file_path AS artist_profile_image_file_path
            FROM songs
            JOIN users ON users.id = songs.user_id
            WHERE songs.id = $id
          `,
          { $id: id },
        ),
      );
    },

    isSongLikedByUser(id, userId) {
      if (!userId) {
        return false;
      }

      return Boolean(
        getFirstRow(
          database,
          `
            SELECT song_id
            FROM song_likes
            WHERE song_id = $id AND user_id = $userId
          `,
          {
            $id: id,
            $userId: userId,
          },
        ),
      );
    },

    toggleSongLike(id, userId) {
      if (!this.findSongById(id)) {
        return {
          song: null,
          isLiked: false,
        };
      }

      const existingLike = getFirstRow(
        database,
        `
          SELECT song_id
          FROM song_likes
          WHERE song_id = $id AND user_id = $userId
        `,
        {
          $id: id,
          $userId: userId,
        },
      );

      if (existingLike) {
        run(
          database,
          `
            DELETE FROM song_likes
            WHERE song_id = $id AND user_id = $userId
          `,
          {
            $id: id,
            $userId: userId,
          },
        );
      } else {
        run(
          database,
          `
            INSERT INTO song_likes (song_id, user_id)
            VALUES ($id, $userId)
          `,
          {
            $id: id,
            $userId: userId,
          },
        );
      }

      const likeCountRow = getFirstRow(
        database,
        "SELECT COUNT(*) AS count FROM song_likes WHERE song_id = $id",
        { $id: id },
      );

      run(database, "UPDATE songs SET like_count = $likeCount WHERE id = $id", {
        $id: id,
        $likeCount: Number(likeCountRow?.count || 0),
      });
      persist();

      return {
        song: this.findSongById(id),
        isLiked: !existingLike,
      };
    },

    recordSongStream({ id, seconds }) {
      run(
        database,
        `
          UPDATE songs
          SET stream_count = stream_count + 1,
            listen_seconds = listen_seconds + $seconds
          WHERE id = $id
        `,
        {
          $id: id,
          $seconds: Math.max(0, Math.round(Number(seconds) || 0)),
        },
      );
      persist();

      return this.findSongById(id);
    },

    listTopSongs() {
      return getRows(
        database,
        `
          SELECT songs.id, songs.user_id, songs.title, songs.artist_name, songs.description,
            songs.audio_file_path, songs.cover_file_path, songs.like_count, songs.stream_count,
            songs.listen_seconds, songs.background_video_file_path,
            songs.background_video_original_name, songs.slideshow_image_paths,
            songs.slideshow_image_original_names, songs.audio_original_name,
            songs.cover_original_name, songs.created_at, songs.updated_at,
            users.id AS artist_id, users.display_name AS artist_display_name,
            users.profile_image_file_path AS artist_profile_image_file_path
          FROM songs
          JOIN users ON users.id = songs.user_id
          ORDER BY songs.like_count DESC, songs.stream_count DESC, songs.created_at DESC
          LIMIT 10
        `,
      ).map(toSongWithArtist);
    },

    deleteSong(id, userId) {
      const song = this.findSongByIdAndUserId(id, userId);

      if (!song) {
        return null;
      }

      run(database, "DELETE FROM songs WHERE id = $id AND user_id = $userId", {
        $id: id,
        $userId: userId,
      });
      persist();

      return song;
    },

    close() {
      persist();
      database.close();
    },
  };
}
