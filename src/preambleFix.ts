// Ensures React Refresh globals always exist before any .tsx module evaluates,
// preventing "@vitejs/plugin-react can't detect preamble" if a browser cached index.html
if (typeof window !== 'undefined') {
  const win = window as unknown as Record<string, unknown>;
  if (typeof win.$RefreshReg$ !== 'function') {
    win.$RefreshReg$ = () => {};
  }
  if (typeof win.$RefreshSig$ !== 'function') {
    win.$RefreshSig$ = () => (type: unknown) => type;
  }
  win.__vite_plugin_react_preamble_installed__ = true;

  // Unregister any stale VitePWA dev-sw.js service worker in dev environment
  if (import.meta.env?.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      })
      .catch(() => {});
  }
}

export {};
