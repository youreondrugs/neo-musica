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
    tags: row.tags ? JSON.parse(row.tags) : [],
    audioFilePath: row.audio_file_path,
    coverFilePath: row.cover_file_path,
    audioOriginalName: row.audio_original_name,
    coverOriginalName: row.cover_original_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
      tags TEXT NOT NULL DEFAULT '[]',
      audio_file_path TEXT NOT NULL,
      cover_file_path TEXT,
      audio_original_name TEXT NOT NULL,
      cover_original_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS songs_user_id_index ON songs(user_id);
  `);
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
          SELECT id, user_id, title, artist_name, tags, audio_file_path, cover_file_path,
            audio_original_name, cover_original_name, created_at, updated_at
          FROM songs
          WHERE user_id = $userId
          ORDER BY created_at DESC
        `,
        { $userId: userId },
      ).map(toSong);
    },

    findSongByIdAndUserId(id, userId) {
      return toSong(
        getFirstRow(
          database,
          `
            SELECT id, user_id, title, artist_name, tags, audio_file_path, cover_file_path,
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
      tags,
      audioFilePath,
      coverFilePath,
      audioOriginalName,
      coverOriginalName,
    }) {
      run(
        database,
        `
          INSERT INTO songs (
            id, user_id, title, artist_name, tags, audio_file_path, cover_file_path,
            audio_original_name, cover_original_name
          )
          VALUES (
            $id, $userId, $title, $artistName, $tags, $audioFilePath, $coverFilePath,
            $audioOriginalName, $coverOriginalName
          )
        `,
        {
          $id: id,
          $userId: userId,
          $title: title,
          $artistName: artistName,
          $tags: JSON.stringify(tags),
          $audioFilePath: audioFilePath,
          $coverFilePath: coverFilePath,
          $audioOriginalName: audioOriginalName,
          $coverOriginalName: coverOriginalName,
        },
      );
      persist();

      return this.findSongByIdAndUserId(id, userId);
    },

    updateSong({ id, userId, title, artistName, tags }) {
      run(
        database,
        `
          UPDATE songs
          SET title = $title,
            artist_name = $artistName,
            tags = $tags,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $id AND user_id = $userId
        `,
        {
          $id: id,
          $userId: userId,
          $title: title,
          $artistName: artistName,
          $tags: JSON.stringify(tags),
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
