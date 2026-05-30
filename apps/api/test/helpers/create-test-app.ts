import { createApp, createTestDependencies } from "../../src/app.js";

export function createTestApp() {
  const dependencies = createTestDependencies();
  const app = createApp({
    allowedOrigins: ["http://localhost:5173"],
    users: dependencies.users,
    authVersions: dependencies.authVersions,
    jwtSecret: "test-secret",
    jwtExpiresIn: "7d",
  });

  return {
    app,
    users: dependencies.users,
    authVersions: dependencies.authVersions,
  };
}
