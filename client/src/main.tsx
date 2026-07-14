import { createRoot } from "react-dom/client";

import { Toaster } from "@/shared/components/ui/sonner.tsx";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import "./index.css";
import { TooltipProvider } from "./shared/components/ui/tooltip.tsx";

createRoot(document.getElementById("root")!).render(
  <>
    <TooltipProvider>
      <Toaster position="top-right" richColors />
      <AuthProvider>
        <App />
      </AuthProvider>
    </TooltipProvider>
  </>,
);
