import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CloudWorld3D } from "./cloud-world-3d/index.ts";

function App() {
  return (
    <CloudWorld3D
      onExit={() => {
        alert("Exit clicked - this would return to portfolio in production");
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);