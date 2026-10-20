import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import { captureAttribution } from "./lib/track";
import "./index.css";

captureAttribution();

const root = document.getElementById("root")!;
const path = window.location.pathname.replace(/\/+$/, "") || "/";

// Hydrate only when the static HTML was prerendered for this exact path. Otherwise
// (the app shell, or a CDN fallback serving another page's HTML) render fresh.
if (root.dataset.prerendered === path) {
  hydrateRoot(root, <App />);
} else {
  root.textContent = "";
  createRoot(root).render(<App />);
}
