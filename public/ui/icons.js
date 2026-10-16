// Ícones da nova identidade (laboratório visual): traço 1,7, currentColor, sem fonte de ícones nem CDN.
const PATHS = {
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
  inbox: "M3 5h18v14H3zM3 12h5l2 3h4l2-3h5",
  wallet: "M3 6h17v14H3zM3 6l14-3v3m-1 6h5v4h-5z",
  cake: "M4 12h16v9H4zM3 16q3 3 6 0 3 3 6 0 3 3 6 0M7 12V8h10v4M12 8V5m0-3v1",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  left: "m14 6-6 6 6 6",
  right: "m10 6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  plus: "M12 5v14M5 12h14",
  info: "M12 11v6m0-10v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  message: "M3 3h18v14H8l-5 4z",
  link: "m9 15 6-6M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0",
};
export const icon = (name, cls = "") =>
  `<svg class="vn-icon${cls ? ` ${cls}` : ""}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name] || PATHS.cake}"/></svg>`;
