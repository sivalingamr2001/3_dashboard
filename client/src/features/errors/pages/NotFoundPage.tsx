import { Link } from "react-router-dom";

export const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
    <div className="space-y-3">
      <h1 className="text-4xl font-semibold">404</h1>
      <p className="text-muted-foreground text-sm">Page not found.</p>
    </div>
    <Link
      to="/dashboard"
      className="bg-primary text-primary-foreground rounded-full px-5 py-3 text-sm font-medium"
    >
      Go to dashboard
    </Link>
  </div>
);
