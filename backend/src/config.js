import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, "../..");

dotenv.config({ path: path.resolve(projectRoot, ".env") });

const configuredDatabasePath = process.env.DATABASE_PATH || "backend/data/neo-musica.sqlite";

export const config = {
  port: Number(process.env.BACKEND_PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  databasePath: path.isAbsolute(configuredDatabasePath)
    ? configuredDatabasePath
    : path.resolve(projectRoot, configuredDatabasePath),
};
