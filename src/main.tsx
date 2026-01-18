import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { initTheme } from "@/lib/theme";
import { initI18n } from "@/i18n";

initTheme();

async function bootstrap() {
  await initI18n();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
