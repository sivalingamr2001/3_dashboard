import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { Toaster } from "@/shared/components/ui/sonner.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
      <Toaster position="top-right" richColors/>
      <AuthProvider>
        <App />
      </AuthProvider>
  </StrictMode>,
);
