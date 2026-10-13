"use strict";

// Select once, after loading the storage adapter and before loading the UI.
// Failed requests must never fall back to a different agenda.
window.DoceApi = Object.freeze({
  mode: window.DoceStore ? "browser" : "server",
  fetch: window.DoceStore
    ? window.DoceStore.fetch.bind(window.DoceStore)
    : window.fetch.bind(window),
});
