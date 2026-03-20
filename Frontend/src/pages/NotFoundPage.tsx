import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

export default function NotFoundPage() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Oops! Page not found.</p>
        <Link to="/" className="inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
