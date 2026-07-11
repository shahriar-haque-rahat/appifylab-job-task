"use strict";

const http = require("http");
const { app } = require("./app");
const { env } = require("./config/env");
const { disconnectRedis } = require("./config/redis");
const { disconnectPrisma } = require("./config/prisma");

const server = http.createServer(app);

server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[server] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`
  );
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`[server] ${signal} received — shutting down gracefully`);
  server.close(async () => {
    try {
      await disconnectRedis();
      await disconnectPrisma();
    } finally {
      process.exit(0);
    }
  });
  // Hard-exit backstop if connections hang.
  setTimeout(() => process.exit(1), 10000).unref();
}

["SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig, () => shutdown(sig))
);

module.exports = { server };
