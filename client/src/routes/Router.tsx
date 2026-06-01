import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { BlankLayout } from "@/layouts/BlankLayout/BlankLayout";
import { SalesProvider } from "@/context/SalesContext";
import { PageLoader } from "@/shared/components/LoadingSpinner/LoadingSpinner";
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RouteErrorBoundary } from "@/shared/components/RouteErrorBoundary";

const LoginPage = lazy(() =>
  import("@/features/auth/pages/LoginPage").then((m) => ({
    default: m.LoginPage,
  })),
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/pages/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/features/errors/pages/NotFoundPage").then((m) => ({
    default: m.NotFoundPage,
  })),
);

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

const withSalesProvider = (Component: React.ComponentType) => (
  <SalesProvider>{withSuspense(Component)}</SalesProvider>
);

const router = createBrowserRouter(
  [
    {
      element: <AuthLayout />,
      errorElement: <RouteErrorBoundary />,
      children: [{ path: "/login", element: withSuspense(LoginPage) }],
    },
    {
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      errorElement: <RouteErrorBoundary />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: "/dashboard", element: withSalesProvider(DashboardPage) },
        {path: "/migrations", element: withSuspense(lazy(() => import("@/features/Migrations/MigrationsPage").then(m => ({ default: m.MigrationsPage }))))}
      ],
    },
    {
      element: <BlankLayout />,
      children: [{ path: "*", element: withSuspense(NotFoundPage) }],
    },
  ],
  { basename: "/mobile_dashboard" },
);

export const Router = () => <RouterProvider router={router} />;
