import "dotenv/config";
import { buildApp } from "./app.js";
import { startSyncWorker } from "./sync-worker.js";

const app = buildApp();
const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
const host = process.env.API_HOST ?? "127.0.0.1";

try {
  await app.listen({ port, host });
  
  if (process.env.DATABASE_TYPE === "sqlite") {
    startSyncWorker();
    app.log.info("SQLite offline sync worker started");
  }
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
