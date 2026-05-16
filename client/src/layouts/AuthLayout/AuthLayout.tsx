import { Outlet } from "react-router-dom";

export const AuthLayout = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
    <div className="w-full max-w-6xl">
      <Outlet />
    </div>
  </div>
);
