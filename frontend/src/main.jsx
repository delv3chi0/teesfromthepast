// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

// Safe, non-blocking CSRF/bootstrap init
import { initApi } from "./api/client";

const cache = createCache({ key: "chakra" });
const root = ReactDOM.createRoot(document.getElementById("root"));

function renderApp() {
  root.render(
    <React.StrictMode>
      <CacheProvider value={cache}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CacheProvider>
    </React.StrictMode>
  );
}

// Fire-and-forget CSRF prewarm, then render.
// If it fails, axios request interceptor will attach the token
// from the csrf cookie on the first unsafe request anyway.
try {
  initApi()
    .catch(() => {
      console.warn("[initApi] CSRF pre-warm failed; will retry on demand.");
    })
    .finally(renderApp);
} catch {
  // Extremely defensive: render even if something unexpected happens.
  renderApp();
}
