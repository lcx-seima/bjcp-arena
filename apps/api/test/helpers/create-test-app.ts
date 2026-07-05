import { createApp, createTestDependencies } from "../../src/app.js";

export function createTestApp() {
  const dependencies = createTestDependencies();
  const app = createApp({
    config: {
      judgeAppBaseUrl: "http://judge.test",
    },
    allowedOrigins: ["http://localhost:5173"],
    users: dependencies.users,
    competitionLoop: dependencies.competitionLoop,
    authUserSnapshots: dependencies.authUserSnapshots,
    jwtSecret: "test-secret",
    jwtExpiresIn: "7d",
  });

  return {
    app,
    users: dependencies.users,
    authUserSnapshots: dependencies.authUserSnapshots,
    competitionLoop: dependencies.competitionLoop,
  };
}
