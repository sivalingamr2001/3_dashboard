import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Spinner } from "@/shared/components/ui/Spinner";
import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function LoginPage() {
  const { login, auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const hasAttemptedLogin = useRef(false);

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";
  const searchParams = new URLSearchParams(location.search);
  const cardNoParam = searchParams.get("cardno");
  const cardNo = cardNoParam ? parseInt(cardNoParam, 10) : null;

  useEffect(() => {
    if (auth?.isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [auth, from, navigate]);

  useEffect(() => {
    if (cardNo !== null && !hasAttemptedLogin.current && !auth?.isAuthenticated) {
      hasAttemptedLogin.current = true;
      handleSubmit(cardNo);
    }
  }, [cardNo, auth]);

  const handleSubmit = async (cardNumber: number) => {
    setError(null);
    setLoading(true);

    try {
      await login(cardNumber);
      navigate(from, { replace: true });
    } catch (err) {
      setError("Invalid credentials or server connection error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Login with your account</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center bg-transparent backdrop-blur-[6px]">
              <div className="inline-flex items-center gap-4 rounded-2xl bg-transparent shadow-none">
                <div className="relative flex h-5 w-5 items-center justify-center">
                  <Spinner />
                </div>
              </div>
            </div>
          ) : error ? (
            <p className="text-center text-sm text-red-500">{error}</p>
          ) : (
            <p className="text-center text-sm text-slate-500">Processing login...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
