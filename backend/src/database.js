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
    createdAt: row.created_at,
  };
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
    audioOriginalName: row.audio_original_name,
    coverOriginalName: row.cover_original_name,
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
  `);

  if (!hasColumn(database, "songs", "description")) {
    database.exec("ALTER TABLE songs ADD COLUMN description TEXT NOT NULL DEFAULT '';");
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
            SELECT id, display_name, email, password_hash, created_at
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
            SELECT id, display_name, email, password_hash, created_at
            FROM users
            WHERE id = $id
          `,
          { $id: id },
        ),
      );
    },

    findUserBySessionTokenHash(tokenHash, now) {
      return toUser(
        getFirstRow(
          database,
          `
            SELECT users.id, users.display_name, users.email, users.password_hash, users.created_at
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
          SELECT users.id, users.display_name, users.created_at,
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

    findArtistById(id, viewerId = null) {
      return toArtist(
        getFirstRow(
          database,
          `
            SELECT users.id, users.display_name, users.created_at,
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

    findRandomSong() {
      return toSongWithArtist(
        getFirstRow(
          database,
          `
            SELECT songs.id, songs.user_id, songs.title, songs.artist_name, songs.description,
              songs.audio_file_path, songs.cover_file_path, songs.audio_original_name,
              songs.cover_original_name, songs.created_at, songs.updated_at,
              users.id AS artist_id, users.display_name AS artist_display_name
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
      audioOriginalName,
      coverOriginalName,
    }) {
      run(
        database,
        `
          INSERT INTO songs (
            id, user_id, title, artist_name, description, audio_file_path, cover_file_path,
            audio_original_name, cover_original_name
          )
          VALUES (
            $id, $userId, $title, $artistName, $description, $audioFilePath, $coverFilePath,
            $audioOriginalName, $coverOriginalName
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
