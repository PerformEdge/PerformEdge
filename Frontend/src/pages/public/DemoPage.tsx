import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Mail, Phone, User, Users, Globe, Briefcase } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { toast } from "@/components/ui/sonner";

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Manufacturing",
  "Other",
];

const EMPLOYEE_BANDS = ["1–25", "26–100", "101–500", "501–1000", "1000+"];

export default function DemoPage() {
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    workEmail: "",
    phone: "",
    company: "",
    role: "",
    country: "",
    industry: "",
    employees: "",
    message: "",
  });

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim()) return "Last name is required.";
    if (!/\S+@\S+\.\S+/.test(form.workEmail)) return "Please enter a valid work email.";
    if (!form.company.trim()) return "Company name is required.";
    if (!form.country.trim()) return "Country is required.";
    if (!form.industry) return "Please select an industry.";
    if (!form.employees) return "Please select an employee band.";
    return null;
  }

  function onSubmit(e) {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error("Please check the form", { description: error });
      return;
    }

    toast.success("Demo request submitted", {
      description: "Thanks! We’ll reach out shortly with next steps.",
    });

    setForm({
      firstName: "",
      lastName: "",
      workEmail: "",
      phone: "",
      company: "",
      role: "",
      country: "",
      industry: "",
      employees: "",
      message: "",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Site
          </Link>

          {/* ✅ Open Dashboard button removed */}
          <div className="flex items-center gap-3">
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
              Request a <span className="text-primary">PerformEdge</span> demo
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Tell us a little about your organization. We’ll schedule a walkthrough and show how the dashboard delivers
              clear workforce insights.
            </p>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Demo request form</CardTitle>
                <CardDescription>Fields are for MVP UI only (no backend connected).</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      icon={User}
                      placeholder="First name"
                      value={form.firstName}
                      onChange={(v) => update("firstName", v)}
                    />
                    <TextField
                      icon={User}
                      placeholder="Last name"
                      value={form.lastName}
                      onChange={(v) => update("lastName", v)}
                    />
                  </div>

                  <TextField
                    icon={Mail}
                    placeholder="Work email"
                    value={form.workEmail}
                    onChange={(v) => update("workEmail", v)}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      icon={Building2}
                      placeholder="Company"
                      value={form.company}
                      onChange={(v) => update("company", v)}
                    />
                    <TextField
                      icon={Briefcase}
                      placeholder="Role (optional)"
                      value={form.role}
                      onChange={(v) => update("role", v)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      icon={Globe}
                      placeholder="Country"
                      value={form.country}
                      onChange={(v) => update("country", v)}
                    />
                    <TextField
                      icon={Phone}
                      placeholder="Phone (optional)"
                      value={form.phone}
                      onChange={(v) => update("phone", v)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      icon={Briefcase}
                      placeholder="Industry"
                      value={form.industry}
                      onChange={(v) => update("industry", v)}
                      options={INDUSTRIES}
                    />
                    <SelectField
                      icon={Users}
                      placeholder="Employees"
                      value={form.employees}
                      onChange={(v) => update("employees", v)}
                      options={EMPLOYEE_BANDS}
                    />
                  </div>

                  <div className="relative">
                    <textarea
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="Message (optional)"
                      className="min-h-[120px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Submit Request
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.08 }}
            className="space-y-6"
          >
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>What you’ll see in the demo</CardTitle>
                <CardDescription>A walkthrough of the MVP dashboard and key KPIs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <Bullet>Attendance trends, late and no-pay percentages</Bullet>
                <Bullet>Performance distribution and appraisal completion</Bullet>
                <Bullet>Workforce segmentation (dept, role, age)</Bullet>
                <Bullet>Clean visual reporting with filters</Bullet>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Dashboard preview</CardTitle>
                <CardDescription>Example mockup (replace with your real data later).</CardDescription>
              </CardHeader>
              <CardContent>
                <img
                  src="/assets/performedge-dashboard.png"
                  alt="PerformEdge dashboard preview"
                  className="w-full rounded-xl border border-border"
                />
              </CardContent>
            </Card>

            <div className="rounded-2xl border border-border bg-primary/10 p-5">
              <div className="text-sm font-semibold">MVP note</div>
              <div className="mt-2 text-sm text-muted-foreground">
                PerformEdge is intentionally built as a strong foundation. You can extend it with automations, integrations
                and role-based access as your organization grows.
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function TextField({ icon: Icon, placeholder, value, onChange }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-border bg-background px-11 text-sm outline-none transition focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function SelectField({ icon: Icon, placeholder, value, onChange, options }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none rounded-2xl border border-border bg-background px-11 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-ring"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">▾</span>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <div className="flex gap-2">
      <span className="mt-2 h-2 w-2 rounded-full bg-primary" />
      <span>{children}</span>
    </div>
  );
}