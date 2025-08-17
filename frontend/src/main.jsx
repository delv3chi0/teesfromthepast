// frontend/src/main.jsx (or whatever your entry file is)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

// Pre-warm CSRF / axios client (safe to render even if this fails)
import { initApi } from './api/client';

const cache = createCache({ key: 'chakra' });
const root = ReactDOM.createRoot(document.getElementById('root'));

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

// Kick off CSRF token fetch in the background, then render.
// If it fails, the axios interceptor will refresh on the first unsafe request anyway.
initApi().catch(() => {
  // Optional: console.warn is fine; we still render.
  console.warn('[initApi] CSRF pre-warm failed; will retry on demand.');
}).finally(renderApp);
