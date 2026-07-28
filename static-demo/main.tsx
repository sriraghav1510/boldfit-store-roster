import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RosterApp } from "../app/roster-app";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Boldfit roster root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <RosterApp />
  </StrictMode>,
);
