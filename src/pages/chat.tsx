import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App";
import AppErrorBoundary from "../components/AppErrorBoundary";
import "../index.css";
import { registerPwa } from "../lib/pwa";

registerPwa();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary><App menu="chat" /></AppErrorBoundary>
  </React.StrictMode>,
);
