import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type z } from "zod";

import { cn } from "@/lib/utils";

import JanaLogo from "@/assets/jana.png";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { loginSchema, type LoginFormValues } from "../schemas/loginSchema";

/* -------------------------------------------------------------------------- */
/*                                    ICONS                                   */
/* -------------------------------------------------------------------------- */

const MailIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

/* -------------------------------------------------------------------------- */
/*                                   BRAND                                    */
/* -------------------------------------------------------------------------- */

const BrandPanel = () => {
  return (
    <div className="border-border bg-card relative hidden gap-6 overflow-hidden border-r p-10 lg:flex lg:flex-col">
      {/* LOGO */}
      <div>
        <img src={JanaLogo} alt="Janatics" className="h-14 w-auto object-contain" />
      </div>

      {/* CONTENT */}
      <div className="space-y-6">
        <div>
          <p className="text-primary mb-3 text-xs font-medium tracking-[0.24em] uppercase">
            Group Dashboard
          </p>

          <h1 className="font-heading text-foreground text-4xl leading-tight font-semibold tracking-tight">
            Financial Year Comparison: FY 2026-27 vs FY 2025-26
          </h1>

          <p className="text-muted-foreground mt-4 max-w-md text-sm leading-7">
            Monitor group turnover, track pending order backlogs, and evaluate
            year-over-year operating unit metrics in real-time.
          </p>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                LOGIN FORM                                  */
/* -------------------------------------------------------------------------- */

interface LoginFormProps {
  onLogin: (data: LoginFormValues) => void | Promise<void>;
}

type LoginFormInput = z.input<typeof loginSchema>;

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const [serverError, setServerError] = useState("");

  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@company.com",
      password: "password123",
      rememberMe: false,
    },
  });

  const {
    register,
    formState: { isSubmitting, errors },
  } = form;

  const onSubmit = async (data: LoginFormInput) => {
    setServerError("");

    try {
      await new Promise((res) => setTimeout(res, 700));

      if (data.password === "wrongpass") {
        setServerError("Invalid email or password.");

        return;
      }

      await onLogin?.({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe ?? false,
      });
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  const fillDemoCredentials = () => {
    setServerError("");
    form.setValue("email", "admin@company.com", { shouldDirty: true });
    form.setValue("password", "password123", { shouldDirty: true });
    form.setValue("rememberMe", true, { shouldDirty: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
      <div className="border-border bg-card grid w-full max-w-5xl overflow-hidden rounded-3xl border shadow-2xl lg:grid-cols-[1fr_480px]">
        {/* LEFT PANEL */}
        <BrandPanel />

        {/* RIGHT PANEL */}
        <div className="bg-background flex items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-sm">
            {/* MOBILE LOGO */}
            <div className="mb-10 lg:hidden">
              <img src={JanaLogo} alt="Janatics" className="h-12 w-auto object-contain" />
            </div>

            {/* HEADER */}
            <div className="mb-8 space-y-2">
              <p className="text-primary text-xs font-medium tracking-[0.24em] uppercase">
                Authentication
              </p>

              <h2 className="font-heading text-foreground text-3xl font-semibold tracking-tight">
                Sign in
              </h2>

              <p className="text-muted-foreground text-sm">
                Enter your credentials to continue.
              </p>

              <div className="border-border bg-secondary/50 text-muted-foreground rounded-2xl border px-4 py-3 text-sm">
                Demo login:{" "}
                <span className="text-foreground font-medium">admin@company.com</span>
                {" / "}
                <span className="text-foreground font-medium">password123</span>
              </div>
            </div>

            {/* ERROR */}
            {serverError && (
              <Alert className="border-destructive/20 bg-destructive/5 text-destructive mb-5">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {/* FORM */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label className="text-muted-foreground mb-2 block text-xs font-medium tracking-wide uppercase">
                  Email
                </Label>
                <div className="group relative">
                  <span
                    className={cn(
                      "text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 transition-colors",
                      errors.email && "text-destructive",
                    )}
                  >
                    <MailIcon />
                  </span>

                  <Input
                    {...register("email")}
                    type="email"
                    placeholder="you@company.com"
                    className="bg-background h-11 rounded-xl pl-10"
                  />
                </div>
                {errors.email ? (
                  <p className="text-destructive mt-2 text-xs">{errors.email.message}</p>
                ) : null}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Password
                  </Label>
                </div>

                <div className="group relative">
                  <span
                    className={cn(
                      "text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 transition-colors",
                      errors.password && "text-destructive",
                    )}
                  >
                    <LockIcon />
                  </span>

                  <Input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="bg-background h-11 rounded-xl pr-10 pl-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-destructive mt-2 text-xs">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <div className="border-border bg-background flex items-center justify-between gap-3 rounded-xl border px-3 py-3">
                <label
                  htmlFor="rememberMe"
                  className="text-foreground text-sm font-medium"
                >
                  Remember me
                </label>
                <Checkbox
                  id="rememberMe"
                  checked={Boolean(form.watch("rememberMe"))}
                  onCheckedChange={(checked) =>
                    form.setValue("rememberMe", Boolean(checked), { shouldDirty: true })
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl"
                  onClick={fillDemoCredentials}
                >
                  Use demo login
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 flex-1 rounded-xl"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
