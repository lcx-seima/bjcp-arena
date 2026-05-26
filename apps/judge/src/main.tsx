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
    <main className="phone-shell">
      <section className="panel">
        <p className="eyebrow">Judge H5</p>
        <h1>BJCP Arena 裁判端</h1>
        <p className="description">Hello world for mobile judging tasks and score submission.</p>
        <div className="status-card">
          <span>API</span>
          <strong>{apiBaseUrl}</strong>
        </div>
        <div className="status-card">
          <span>Ping</span>
          <strong>{error ?? message}</strong>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
