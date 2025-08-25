// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { CacheProvider } from "@emotion/react";
import { HelmetProvider } from "react-helmet-async";
import createCache from "@emotion/cache";

const cache = createCache({ key: "chakra" });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <CacheProvider value={cache}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CacheProvider>
    </HelmetProvider>
  </React.StrictMode>
);
