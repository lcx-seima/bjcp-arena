import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function readPort(value: string | undefined, fallback: number) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : fallback;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      host: env.DEV_SERVER_HOST ?? "0.0.0.0",
      port: readPort(env.DEV_SERVER_PORT, 5174),
      strictPort: true,
    },
  };
});
