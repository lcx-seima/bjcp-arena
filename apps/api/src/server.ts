import { createApp } from "./app.js";
import { getApiConfig } from "./config.js";

const config = getApiConfig();
const app = createApp({
  allowedOrigins: config.allowedOrigins,
});

app
  .listen({
    host: config.host,
    port: config.port,
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
