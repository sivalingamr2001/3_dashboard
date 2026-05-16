import { useLocation, useNavigate } from "react-router-dom";
import type { LoginFormValues } from "../schemas/loginSchema";
import { useAuthStore } from "@/core/store/authStore";
import LoginForm from "../components/LoginForm";

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setCredentials = useAuthStore((s) => s.setCredentials);

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";

  const handleLogin = async (data: LoginFormValues) => {
    setCredentials(
      { id: "1", email: data.email, name: "Admin", role: "admin" },
      "demo-token",
    );
    navigate(from, { replace: true });
  };

  return <LoginForm onLogin={handleLogin} />;
};
