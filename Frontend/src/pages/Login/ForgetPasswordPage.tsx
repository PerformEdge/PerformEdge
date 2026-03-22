import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormAlert } from "@/components/FormAlert";

const API_BASE = "https://performedge.onrender.com";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState<string[]>(Array(6).fill(""));
  const [newPassword, setNewPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [message, setMessage] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [countdown, setCountdown] = React.useState(10);

  const otpRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const isSuccess = React.useMemo(() => {
    const m = message.toLowerCase();
    return (
      m.includes("sent") ||
      m.includes("success") ||
      m.includes("updated") ||
      m.includes("redirect")
    );
  }, [message]);

  const handleOtpChange = (val: string, i: number) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);

    if (val && i < 5) {
      otpRefs.current[i + 1]?.focus();
    }
  };

  const sendOtp = async () => {
    setMessage("");

    if (!email.trim()) {
      setMessage("Email is required");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setMessage("Invalid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send OTP");

      setStep(2);
      setMessage("OTP sent to your email");
    } catch (err: any) {
      setMessage(err?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setMessage("");

    if (otp.join("").length !== 6) {
      setMessage("Please enter the 6-digit OTP");
      return;
    }

    if (!newPassword) {
      setMessage("Password is required");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.join(""),
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Password update failed");

      setStep(3);
      setMessage("Password updated successfully");
    } catch (err: any) {
      setMessage(err?.message || "Password update failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto redirect to login after success
  React.useEffect(() => {
    if (step !== 3) return;

    const timer = window.setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    const redirect = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 10000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(redirect);
    };
  }, [step, navigate]);

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      {/* Back to login */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="absolute left-4 top-4 rounded-full bg-white/90 hover:bg-white"
        onClick={() => navigate("/login")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card className="w-full max-w-md rounded-2xl border border-border bg-card shadow-[0_25px_70px_rgba(0,0,0,0.35)]">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-md overflow-hidden">
              <img
                src="/logo.png"
                alt="PerformEdge Logo"
                className="h-full w-full object-cover"
              />
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-primary">
              Reset password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We’ll help you get back in
            </p>
          </div>

          {message ? (
            <FormAlert
              className="mt-6"
              variant={isSuccess ? "success" : "error"}
              message={message}
            />
          ) : null}

          {/* Step content */}
          <div className="mt-8 space-y-5">
            {step === 1 ? (
              <>
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

                <Button
                  type="button"
                  disabled={loading}
                  onClick={sendOtp}
                  className="h-12 w-full rounded-xl text-base"
                >
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Verification code
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpRefs.current[i] = el;
                        }}
                        maxLength={1}
                        inputMode="numeric"
                        value={d}
                        onChange={(e) => handleOtpChange(e.target.value, i)}
                        className="h-12 w-12 rounded-xl border border-border bg-background text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-ring"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-16 text-sm outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary hover:underline"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={loading}
                  onClick={changePassword}
                  className="h-12 w-full rounded-xl text-base"
                >
                  {loading ? "Updating..." : "Change password"}
                </Button>
              </>
            ) : null}

            {step === 3 ? (
              <div className="text-center space-y-2">
                <div className="text-base font-bold text-foreground">
                  Password updated successfully
                </div>
                <div className="text-sm text-muted-foreground">
                  Redirecting to login in {countdown}s
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => navigate("/login", { replace: true })}
                >
                  Go to Login
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
