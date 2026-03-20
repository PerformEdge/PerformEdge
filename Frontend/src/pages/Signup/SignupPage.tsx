import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const API_BASE = "http://localhost:8000";

export default function SignupPage() {
  const [companyId, setCompanyId] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [signupAs, setSignupAs] = React.useState("employee");
  const [loading, setLoading] = React.useState(false);
  

  // inline message in-card
  const [message, setMessage] = React.useState("");
  const [messageType, setMessageType] = React.useState("error"); // "error" | "success"

  const navigate = useNavigate();

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  async function onSubmit(e) {
    e.preventDefault();
    setMessage("");

    

    if (!isValidEmail(email.trim())) {
      setMessageType("error");
      setMessage("Invalid email address");
      return;
    }

    if (password.length > 6) {
      setMessageType("error");
      setMessage("Password must be 6 characters or less");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId.trim(),
          user_name: name.trim(),
          email: email.trim(),
          password,
          signup_as: signupAs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      setMessageType("success");
      setMessage("Signup successful! Redirecting to login...");

      setCompanyId("");
      setName("");
      setEmail("");
      setPassword("");
      setSignupAs("");

      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setMessageType("error");
      setMessage(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      {/* Back to login */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="absolute left-4 top-4 rounded-full bg-white/90 hover:bg-white text-black"
        onClick={() => navigate("/login")}
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
              Create your account to get started
            </p>
          </div>

          {/* Inline Message */}
          {message ? (
            <div
              className={[
                "mt-6 rounded-xl border px-4 py-3 text-sm font-semibold text-center",
                messageType === "success"
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                  : "border-red-500/25 bg-red-500/10 text-red-700",
              ].join(" ")}
              role="alert"
            >
              {message}
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            {/* Company ID */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Company ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="COMP-001"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {/* Job Roles */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Signup as
              </label>

              <div className="inline-flex overflow-hidden rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setSignupAs("employee")}
                  className={[
                  "px-4 py-2 text-sm font-bold",
                  signupAs === "employee"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted",
                  ].join(" ")}
                  >
                  Employee
                </button>

                <button
                  type="button"
                  onClick={() => setSignupAs("manager")}
                  className={[
                  "px-4 py-2 text-sm font-bold",
                  signupAs === "manager"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted",
                  ].join(" ")}
                  >
                  Manager
                </button>
              </div>
            </div>

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
                Password (max 6 chars)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl text-base"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}