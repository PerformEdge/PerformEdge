import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bolt, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { FormAlert } from "@/components/FormAlert";
import { normalizeEmail, sanitizeInput, setAuthSession } from "@/lib/security";

const API_BASE = "http://localhost:8000";

type LoginRole = "employee" | "manager";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Inline banner messages (matches your 2nd screenshot behavior)
  const [formError, setFormError] = React.useState<string | null>(null);

  // Needed for the two-dashboards requirement
  const [loginAs, setLoginAs] = React.useState<LoginRole>("employee");

  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const safeEmail = normalizeEmail(email);
    const safePassword = sanitizeInput(password);

    if (!safeEmail || !safePassword) {
      setFormError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: safeEmail, password: safePassword, login_as: loginAs }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // ✅ Store role for routing (backend is source of truth)
      const role: LoginRole = (data?.role as LoginRole) || "employee";
      setAuthSession({
        accessToken: String(data.access_token || ""),
        user: data.user,
        role,
        roles: Array.isArray(data?.roles) ? data.roles : undefined,
      });

      toast.success(`Welcome back, ${data.user.user_name || "User"}!`);

      // ✅ Redirect based on role
      navigate(role === "manager" ? "/dashboard" : "/employee");
    } catch (err: any) {
      setFormError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      {/* Back to landing page */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="absolute left-4 top-4 rounded-full bg-white/90 hover:bg-white text-black"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card className="w-full max-w-md rounded-2xl border border-border bg-card shadow-[0_25px_70px_rgba(0,0,0,0.35)]">
        <CardContent className="p-8">
            {/* Logo */}
            <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl  flex items-center justify-center shadow-md overflow-hidden">
              <img 
              src="/logo.png" 
              alt="PerformEdge Logo"
              className="h-full w-full object-cover"
              />
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-primary">
              PerformEdge
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Elevate Your Performance Management
            </p>
          </div>

          {/* Inline error banner (not a bottom toast) */}
          {formError ? <FormAlert className="mt-5">{formError}</FormAlert> : null}

          {/* Form */}
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Role selector (required for the two dashboards) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Login as:
                  </span>

                  <div className="inline-flex overflow-hidden rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => setLoginAs("employee")}
                      className={[
                        "px-3 py-2 text-xs font-bold",
                        loginAs === "employee"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      Employee
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginAs("manager")}
                      className={[
                        "px-3 py-2 text-xs font-bold",
                        loginAs === "manager"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      Manager
                    </button>
                  </div>
                </div>

                <Link
                  to="/forget-password"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Login */}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl text-base"
            >
              {loading ? "Signing in..." : "Login"}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-4 py-1">
              <Separator className="flex-1" />
              <span className="text-xs font-semibold text-muted-foreground">
                OR
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Bottom link */}
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
