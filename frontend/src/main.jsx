import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./fonts.css";
import "./styles.css";
import "./ui-refresh.css";
import "./class-workspace.css";
import "./design-system.css";

createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
);
