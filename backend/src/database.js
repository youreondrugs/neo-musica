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

    close() {
      persist();
      database.close();
    },
  };
}
