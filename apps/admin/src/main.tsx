import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createApiClient, type FetchLike } from "@bjcp-arena/api-client";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const client = createApiClient({
  baseUrl: apiBaseUrl,
  fetch: fetch as FetchLike,
});

function App() {
  const [message, setMessage] = useState("loading...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .ping()
      .then((result) => {
        setMessage(`${result.message} from ${result.service}`);
      })
      .catch((unknownError: unknown) => {
        setError(unknownError instanceof Error ? unknownError.message : "Unknown API error");
      });
  }, []);

  return (
    <main className="shell admin-shell">
      <section className="hero">
        <p className="eyebrow">Admin Console</p>
        <h1>BJCP Arena 后台管理</h1>
        <p className="description">Hello world for competition setup, judge accounts, beer entries.</p>
        <dl className="status-grid">
          <div>
            <dt>API</dt>
            <dd>{apiBaseUrl}</dd>
          </div>
          <div>
            <dt>Ping</dt>
            <dd>{error ?? message}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
