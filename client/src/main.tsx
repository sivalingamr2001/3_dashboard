import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";
import { AppProviders } from "./providers";
import { TooltipProvider } from "./shared/components/ui/tooltip.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </AppProviders>
  </StrictMode>,
);
