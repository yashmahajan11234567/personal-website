import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Bundled so the hero never depends on a locally installed font. Must load
// before the stylesheets that reference it, so the family is available on the
// first paint rather than swapping in after a flash of fallback type.
import "@fontsource/archivo-black/400.css";
import "@fontsource/league-gothic/400.css";
import "./styles/globals.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
