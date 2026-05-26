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
    <main className="board-shell">
      <section className="headline">
        <p className="eyebrow">Live Board</p>
        <h1>BJCP Arena 实时大盘</h1>
      </section>
      <section className="metrics">
        <article>
          <span>API</span>
          <strong>{apiBaseUrl}</strong>
        </article>
        <article>
          <span>Ping</span>
          <strong>{error ?? message}</strong>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
