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
  // Direção Comanda (16/10): ícones do ofício, cada um ligado a um conceito.
  bag: "M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2",
  delivery: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01",
  whisk: "M12 14v8M8.5 3.5C7 6 8 11 12 14c4-3 5-8 3.5-10.5S9.9 1.9 8.5 3.5ZM12 3v11",
  alert: "M12 9v4m0 4v.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  close: "M6 6l12 12M18 6 6 18",
  pix: "m12 3 4 4-4 4-4-4zM3 12l4-4 4 4-4 4zM13 12l4-4 4 4-4 4zM12 13l4 4-4 4-4-4z",
};
// Ícones de marca preenchidos (o WhatsApp só aparece em ações que abrem o WhatsApp).
const FILLED = {
  whatsapp: "M12 2.2a9.7 9.7 0 0 0-8.3 14.7L2.3 21.8l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.2-.2-.5-.3Z",
};
export const icon = (name, cls = "") => FILLED[name]
  ? `<svg class="vn-icon${cls ? ` ${cls}` : ""}" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${FILLED[name]}"/></svg>`
  :
  `<svg class="vn-icon${cls ? ` ${cls}` : ""}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name] || PATHS.cake}"/></svg>`;
