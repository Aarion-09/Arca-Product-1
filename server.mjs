// Hostinger entry point.
//
// Start command: npm start
// Hostinger injects PORT; we bind 0.0.0.0 so the reverse proxy can reach us.

import { createArcaServer } from "./lib/server-core.mjs";
import { PORT, VERSION, operatorConfigured, IS_PRODUCTION } from "./lib/config.mjs";
import { smtpConfigured } from "./lib/mailer.mjs";

const server = createArcaServer();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ARCA ${VERSION} listening on http://0.0.0.0:${PORT}`);
  console.log(`  storage : ${process.env.DB_NAME ? "mysql" : "in-memory (set DB_NAME to persist)"}`);
  console.log(`  email   : ${smtpConfigured() ? "configured" : "NOT configured — links go to this log"}`);
  if (!operatorConfigured()) {
    console.warn(
      "  WARNING : operator identity is not configured. Set OPERATOR_RESPONSIBLE and\n" +
      "            OPERATOR_ADDRESS before launch — the legal documents name them, and\n" +
      "            sign-up is disabled in production until they are set."
    );
  }
  if (IS_PRODUCTION && !process.env.DB_NAME) {
    console.warn("  WARNING : running in production without a database. Data will be lost on restart.");
  }
});

// Graceful shutdown. Hostinger restarts the app on deploy and when it idles;
// without this, in-flight requests are cut and the MySQL pool is left open.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — finishing in-flight requests.`);
  clearInterval(server.retentionTimer);
  const forced = setTimeout(() => {
    console.error("Shutdown timed out. Exiting.");
    process.exit(1);
  }, 10_000);
  forced.unref();
  server.close(async () => {
    try {
      await server.closeStore();
    } catch (error) {
      console.error("Error closing store:", error.message);
    }
    clearTimeout(forced);
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => console.error("[unhandledRejection]", reason));
process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
  shutdown("uncaughtException");
});
