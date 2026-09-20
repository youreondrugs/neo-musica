import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(dirname, "../../.env") });

export const config = {
  port: Number(process.env.BACKEND_PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
};
