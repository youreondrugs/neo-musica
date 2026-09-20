import { createApp } from "./app.js";
import { config } from "./config.js";
import { createDatabase } from "./database.js";

const database = await createDatabase({ databasePath: config.databasePath });
const app = createApp({ database, uploadsPath: config.uploadsPath });

app.listen(config.port, () => {
  console.log(`Neo Musica API listening on http://localhost:${config.port}`);
});
