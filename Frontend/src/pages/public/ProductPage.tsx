import * as React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Gauge,
  Layers,
  LineChart as LineChartIcon,
  Menu,
  PieChart as PieChartIcon,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Calendar,
  Building2,
  Mail,
  MessageSquare,
  Play,
  Github,
  Linkedin,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Instagram } from "lucide-react";


import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { section } from "framer-motion/client";

const NAV_ITEMS = [
  { label: "Product", href: "#home" },
  { label: "Solutions", href: "#solution" },
  { label: "Analytics", href: "#analytics" },
  { label: "Learn", href: "#learn" },
  { label: "Pricing", href: "#pricing" },
  { label: "Team", href: "#team" },
  { label: "About", href: "#about" },
];

const WHO_ITS_FOR = [
  {
    icon: Users,
    title: "HR Teams",
    text: "Manage employee records, attendance, appraisals, and KPIs from one place.",
  },
  {
    icon: BarChart3,
    title: "Managers",
    text: "Track performance distribution and team trends without manual spreadsheets.",
  },
  {
    icon: Gauge,
    title: "Executives",
    text: "Make faster workforce decisions with clear, real-time visual reporting.",
  },
];

const KEY_FEATURES = [
  {
    icon: Layers,
    title: "Centralized HR Dashboard",
    text: "One dashboard for employee information, attendance and performance KPIs.",
  },
  {
    icon: Users,
    title: "Employee Information Management (EIM)",
    text: "Structured employee profiles with role, department and segmentation.",
  },
  {
    icon: Calendar,
    title: "Attendance & Time Analytics",
    text: "Track attendance trends, late % and no-pay % at a glance.",
  },
  {
    icon: LineChartIcon,
    title: "Performance & Appraisal Insights",
    text: "Performance distribution and appraisal completion — clearly visualized.",
  },
  {
    icon: ShieldCheck,
    title: "Reliable MVP",
    text: "Focused on usability and practical analytics — easy to extend later.",
  },
  {
    icon: Sparkles,
    title: "Clean Visual Reporting",
    text: "Readable charts, summary cards and filters that make insights obvious.",
  },
];

const PRICING = {
  monthly: [
    {
      name: "Free",
      price: "$0",
      note: "Perfect for testing the MVP",
      features: [
        "Centralized dashboard overview",
        "Basic attendance insights",
        "Performance distribution snapshot",
        "Up to 25 employees",
      ],
      cta: "Start Free",
      highlight: false,
    },
    {
      name: "Premium",
      price: "$25",
      note: "For teams that need deeper reporting",
      features: [
        "All Free features",
        "Advanced KPI reports (late & no-pay)",
        "Workforce segmentation",
        "Unlimited employees",
        "Priority support",
      ],
      cta: "Request Demo",
      highlight: true,
    },
  ],
  yearly: [
    {
      name: "Free",
      price: "$0",
      note: "Perfect for testing the MVP",
      features: [
        "Centralized dashboard overview",
        "Basic attendance insights",
        "Performance distribution snapshot",
        "Up to 25 employees",
      ],
      cta: "Start Free",
      highlight: false,
    },
    {
      name: "Premium",
      price: "$240",
      note: "Save 20% on annual billing",
      features: [
        "All Free features",
        "Advanced KPI reports (late & no-pay)",
        "Workforce segmentation",
        "Unlimited employees",
        "Priority support",
      ],
      cta: "Request Demo",
      highlight: true,
    },
  ],
};

const attendanceTrend = [
  { month: "Jan", rate: 88 },
  { month: "Feb", rate: 90 },
  { month: "Mar", rate: 87 },
  { month: "Apr", rate: 92 },
  { month: "May", rate: 91 },
  { month: "Jun", rate: 93 },
];

const performanceDistribution = [
  { name: "High", value: 24 },
  { name: "Medium", value: 58 },
  { name: "Low", value: 18 },
];

const deptBar = [
  { dept: "Engineering", count: 45 },
  { dept: "Sales", count: 30 },
  { dept: "Marketing", count: 15 },
  { dept: "HR", count: 10 },
];

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

function Header({ onOpenMobile, onOpenDemo }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/70 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <a href="#home" className="flex items-center gap-2 font-bold tracking-tight">
          <img
            src="/logo.png"
            alt="PerformEdge logo"
            className="h-14 w-14 rounded-2xl"
          />
          <span className="text-lg">PerformEdge</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            <ThemeToggleButton />
          </div>

          <Link
        to="/login"
            className={buttonClasses({ variant: "outline", size: "sm" })}
          >
            Login
          </Link>

          <Link
            to="/demo"
            className={buttonClasses({ variant: "default", size: "sm", className: "hidden sm:inline-flex" })}
          >
            Request Demo
            <ArrowRight className="h-4 w-4" />
          
          </Link>

          <button
            onClick={onOpenDemo}
            className={buttonClasses({ variant: "default", size: "sm", className: "hidden sm:inline-flex ml-2" })}
>
            Watch Demo
          </button>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={onOpenMobile}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/60 text-foreground shadow-sm backdrop-blur lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileMenu({ open, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />

          <motion.div
            className="absolute right-0 top-0 h-full w-[86%] max-w-sm border-l border-border bg-background p-6 shadow-2xl"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
          >
            <div className="flex items-center justify-between">
              <div className="font-bold">Menu</div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6">
              <ThemeToggleButton showLabel className="w-full justify-center" />
            </div>

            <nav className="mt-6 grid gap-2">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-xl border border-border bg-card/40 px-4 py-3 font-semibold"
                >
                  {item.label}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </nav>

            <div className="mt-6 grid gap-3">
              <Link
                to="/dashboard"
                onClick={onClose}
                className={buttonClasses({ variant: "outline" })}
              >
                Open Dashboard
              </Link>
              <Link
                to="/demo"
                onClick={onClose}
                className={buttonClasses({ variant: "default" })}
              >
                Request Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pt-28 pb-10">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/30 blur-[80px]" />
        <div className="absolute -bottom-40 left-12 h-[340px] w-[340px] rounded-full bg-accent/20 blur-[90px]" />
      </div>

      <div className="container relative">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <Badge variant="secondary" className="inline-flex gap-2">
                <Sparkles className="h-4 w-4" />
                HR Analytics • Workforce Intelligence
              </Badge>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
                PerformEdge – <span className="text-primary">HR Analytics</span> &amp; Workforce Intelligence Dashboard
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
                PerformEdge is a centralized HR analytics dashboard built to fix fragmented HR data.
                It consolidates employee information, attendance records, performance metrics and key HR KPIs
                into a single interactive view — so management gets clear, real-time visibility.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#features" className={buttonClasses({ variant: "default", size: "lg" })}>
                  Explore Features
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link to="/demo" className={buttonClasses({ variant: "outline", size: "lg" })}>
                  Request a Demo
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-14 grid grid-cols-3 gap-4 max-w-xl">
                <MiniStat label="KPIs" value="10+" />
                <MiniStat label="Dashboards" value="1" />
                <MiniStat label="MVP Focus" value="Usability" />
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="relative">
            <motion.div
              className="relative rounded-2xl border border-border bg-card/70 p-3 shadow-2xl backdrop-blur"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            >
              <img
                src="/assets/performedge-hero.png"
                alt="PerformEdge dashboard mockup"
                className="w-full rounded-xl"
              />
              <div className="pointer-events-none absolute -bottom-6 left-6 right-6 h-12 rounded-full bg-primary/20 blur-2xl" />
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 text-center shadow-sm backdrop-blur">
      <div className="text-2xl font-extrabold text-foreground">{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, icon: Icon }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Reveal>
        {eyebrow ? (
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
            {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
            {eyebrow}
          </div>
        ) : null}
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      </Reveal>
      {description ? (
        <Reveal delay={0.1}>
          <p className="mt-4 text-balance text-muted-foreground">{description}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

function WhoItsFor() {
  return (
    <section className="py-20">
      <div className="container">
        <SectionHeader
          eyebrow="Built for HR decision-makers"
          icon={Users}
          title="Know what’s happening in your workforce — instantly"
          description="PerformEdge brings employee information, attendance, and performance KPIs into a single dashboard so teams don’t waste time chasing data."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {WHO_ITS_FOR.map((item, idx) => (
            <Reveal key={item.title} delay={0.05 * idx}>
              <Card className="group h-full overflow-hidden transition hover:-translate-y-1 hover:shadow-xl">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-3 text-sm">{item.text}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section id="solution" className="py-20">
      <div className="container">
        <SectionHeader
          eyebrow="The core idea"
          icon={Layers}
          title="One source of truth for HR performance"
          description="PerformEdge consolidates fragmented HR data into a single interactive dashboard. It focuses on practical analytics and usability instead of complex automation — making it reliable and easy to extend."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <Reveal>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Data Consolidation</CardTitle>
                <CardDescription>
                  Employee info (EIM), attendance records, performance metrics and appraisals — unified.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FlowRow />
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.05}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Interactive KPIs</CardTitle>
                <CardDescription>
                  Attendance trends, late/no-pay %, performance distribution, appraisal completion and segmentation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <KpiPill label="Attendance" value="93%" />
                  <KpiPill label="Late" value="4.2%" />
                  <KpiPill label="No-Pay" value="1.1%" />
                  <KpiPill label="Appraisals" value="72%" />
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Fast Decisions</CardTitle>
                <CardDescription>
                  Clean charts and summary cards highlight trends quickly — helping management act confidently.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <ListItem>Filter by date, department, or role</ListItem>
                  <ListItem>Spot attendance spikes and risk patterns</ListItem>
                  <ListItem>Compare teams with clear visual reporting</ListItem>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FlowRow() {
  return (
    <div className="grid gap-3 text-sm">
      <FlowChip icon={Users} label="Employee Data (EIM)" />
      <FlowChip icon={Calendar} label="Attendance Records" />
      <FlowChip icon={BarChart3} label="Performance Metrics" />
      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-primary/10 p-3">
        <ArrowRight className="h-4 w-4 text-primary" />
        <span className="font-semibold">PerformEdge Dashboard</span>
      </div>
    </div>
  );
}

function FlowChip({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-primary" />
      <span className="font-semibold">{label}</span>
    </div>
  );
}

function KpiPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function ListItem({ children }) {
  return (
    <div className="flex gap-2">
      <Check className="mt-0.5 h-4 w-4 text-primary" />
      <span>{children}</span>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="py-20">
      <div className="container">
        <SectionHeader
          eyebrow="Key product features"
          icon={Sparkles}
          title="Everything you need for an HR analytics MVP"
          description="Designed for practical reporting — centralized, readable, and fast."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {KEY_FEATURES.map((f, idx) => (
            <Reveal key={f.title} delay={0.04 * idx}>
              <Card className="h-full transition hover:-translate-y-1 hover:shadow-xl">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-3">{f.text}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Dashboard Overview</CardTitle>
                <CardDescription>
                  KPI summary cards, charts & graphs, filters and date range controls — all in one view.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <img
                  src="/assets/performedge-dashboard.png"
                  alt="PerformEdge dashboard preview"
                  className="w-full rounded-xl border border-border"
                />
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                  <ListItem>KPI summary cards for instant status</ListItem>
                  <ListItem>Charts for trends and distribution</ListItem>
                  <ListItem>Filters & date ranges for comparison</ListItem>
                </div>
                <div className="mt-6">
                  <Link to="/dashboard" className={buttonClasses({ variant: "default" })}>
                    Open Dashboard MVP
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>KPIs you can track</CardTitle>
                <CardDescription>
                  Focused KPIs that help HR and management understand workforce health quickly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <KpiCard title="Attendance Rate" value="93.5%" />
                  <KpiCard title="Late %" value="4.2%" />
                  <KpiCard title="No-Pay %" value="1.1%" />
                  <KpiCard title="Appraisal Completion" value="72%" />
                  <KpiCard title="Performance Split" value="High / Mid / Low" />
                  <KpiCard title="Segmentation" value="Dept • Role • Age" />
                </div>
              </CardContent>
            </Card>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function KpiCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-muted-foreground">{title}</div>
      <div className="mt-1 text-lg font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function Analytics() {
  return (
    <section id="analytics" className="py-20">
      <div className="container">
        <SectionHeader
          eyebrow="Visual analytics"
          icon={BarChart3}
          title="Clean charts that make insights obvious"
          description="These sample visuals show how PerformEdge turns HR data into readable insights." 
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <Reveal>
            <ChartCard
              title="Attendance Trends"
              icon={LineChartIcon}
              description="Line chart showing monthly attendance rate."
            >
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} domain={[80, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                      }} 
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </Reveal>

          <Reveal delay={0.05}>
            <ChartCard
              title="Department Breakdown"
              icon={BarChart3}
              description="Bar chart showing employee distribution by department."
            >
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptBar} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="dept" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </Reveal>

          <Reveal delay={0.1}>
            <ChartCard
              title="Performance Distribution"
              icon={PieChartIcon}
              description="Donut chart showing high/medium/low performance split."
            >
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {performanceDistribution.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                      }}
                    />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ChartCard({ title, description, icon: Icon, children }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Learn() {
  const steps = [
    {
      title: "Connect your HR sources",
      text: "Bring EIM, attendance and performance datasets together.",
    },
    {
      title: "View KPIs in real time",
      text: "Summary cards and charts instantly show workforce status.",
    },
    {
      title: "Act with confidence",
      text: "Use segmentation and trends to support management decisions.",
    },
  ];

  return (
    <section id="learn" className="py-20">
      <div className="container">
        <SectionHeader
          eyebrow="How it works"
          icon={Gauge}
          title="Practical workflow, no complexity"
          description="PerformEdge is built as a strong MVP. It focuses on clean reporting and reliability — so it’s easy to trust and easy to extend." 
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {steps.map((s, idx) => (
            <Reveal key={s.title} delay={0.05 * idx}>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{s.title}</CardTitle>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-bold">
                      {idx + 1}
                    </span>
                  </div>
                  <CardDescription className="mt-2">{s.text}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const [billing, setBilling] = React.useState("monthly");
  const plans = PRICING[billing];

  return (
    <section id="pricing" className="py-20">
      <div className="container">
        <SectionHeader
          eyebrow="Pricing"
          icon={ShieldCheck}
          title="Simple plans that match an MVP"
          description="Start free, upgrade when your analytics needs grow."
        />

        <Reveal>
          <div className="mt-10 flex items-center justify-center">
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling("yearly")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  billing === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Yearly
              </button>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {plans.map((plan, idx) => (
            <Reveal key={plan.name} delay={0.05 * idx}>
              <Card
                className={cn(
                  "relative h-full overflow-hidden",
                  plan.highlight ? "ring-1 ring-primary shadow-xl" : "",
                )}
              >
                {plan.highlight ? (
                  <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    Most Popular
                  </div>
                ) : null}

                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">{plan.note}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <div className="text-4xl font-extrabold text-foreground">{plan.price}</div>
                    {plan.name !== "Free" ? (
                      <div className="pb-1 text-sm text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</div>
                    ) : null}
                  </div>

                  <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                    {plan.features.map((feat) => (
                      <ListItem key={feat}>{feat}</ListItem>
                    ))}
                  </div>

                  <div className="mt-8">
                    {plan.cta === "Request Demo" ? (
                      <Link to="/demo" className={buttonClasses({ variant: plan.highlight ? "default" : "outline", size: "lg", className: "w-full" })}>
                        {plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <a href="#contact" className={buttonClasses({ variant: "outline", size: "lg", className: "w-full" })}>
                        {plan.cta}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const TEAM = [
  { 
    name: "Senadhi Mandina", 
    role: "Full Stack Developer", 
    image: "/assets/team/senadhi.jpg",
    github:"https://github.com/SenadhiMandina",
    linkedin: "www.linkedin.com/in/senadhi-mandina",
    details: "Played a key role in developing the Performance Analytics module, contributing to both the frontend and backend."
  },
  { 
    name: "Harinitha Wasathhara", 
    role: "Full Stack Developer", 
    image: "/assets/team/harinitha.png",
    github: "https://github.com/hariya003",
    linkedin: "www.linkedin.com/in/harinitha-wasathhara",
    details: "A core contributor to the Employee Dashboard module, working across both frontend and backend."
  },
  { 
    name: "Achira Vitharanage", 
    role: "Full Stack Developer", 
    image: "/assets/team/achira.jpeg",
    github: "https://github.com/achirav",
    linkedin: "2",
    details: "Contributed to the database layer, date utility functions, and shared backend infrastructure and contributed to both frontend and backend.."
  },
  { 
    name: "Disadhi Ranasinghe", 
    role: "Full Stack Developer", 
    image: "/assets/team/disadhi.jpeg",
    github: "https://github.com/disdyy",
    linkedin: "https://www.linkedin.com/in/disadhi-ranasinghe-a74734332/",
    details: "A key contributor to the Attendance Analytics module, working on both the frontend and backend."
  },
  { 
    name: "Osandi Randeniya", 
    role: "Full Stack Developer", 
    image: "/assets/team/osandi.jpeg",
    github: "https://github.com/osandipabasara-design",
    linkedin: "https://www.linkedin.com/in/osandi-randeniya-a59b61353",
    details: "Instrumental in building the Employee Information Management (EIM) module, contributing to both frontend and backend."
  },
  { 
    name: "Kavindu Wijeynayaka", 
    role: "Full Stack Developer", 
    image: "/assets/team/kavindu.png",
    github: "https://github.com/kavidu284",
    linkedin: "https://www.linkedin.com/in/kavidu-wijenayaka-637966332/",
    details: "Made significant contributions to the EIM module across both frontend and backend."
  },
];

function Team() {
  const [hoveredIdx, setHoveredIdx] = React.useState(null);

  return (
    <section id="team" className="py-20">
      <div className="container">
        <SectionHeader
          eyebrow="Our team"
          icon={Users}
          title="Built by a focused project team"
          description="A small team delivering a practical MVP with room to grow."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m, idx) => (
            <Reveal key={m.name} delay={0.05 * idx}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <Card className="group overflow-hidden rounded-3xl border-border bg-card/60 shadow-sm backdrop-blur transition hover:shadow-2xl">
                  <div className="h-20 w-full bg-gradient-to-br from-primary/15 via-muted/10 to-accent/10" />

                  <CardContent className="p-8 pt-2">
                    <div className="-mt-10 flex items-end gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border shadow-sm">
                        <img
                          src={m.image}
                          alt={m.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]"
                          loading="lazy"
                        />
                      </div>
                      <div className="pb-1">
                        <div className="text-lg font-extrabold tracking-tight">{m.name}</div>
                        <div className="mt-1 inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {m.role}
                        </div>
                      </div>
                    </div>

                    {/* Details fade in on hover */}
                    <AnimatePresence initial={false}>
                      {hoveredIdx === idx && (
                        <motion.p
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.25 }}
                          className="mt-4 text-sm text-muted-foreground"
                        >
                          {m.details}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Social links — always visible */}
                    <div className="mt-4 flex items-center gap-3">
                      {m.github && (
                        <a
                          href={m.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground transition hover:text-foreground hover:border-foreground"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {m.linkedin && (
                        <a
                          href={m.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground transition hover:text-blue-500 hover:border-blue-500"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                  </CardContent>
                </Card>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ showDemo, setShowDemo }) {

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    if (!form.name.trim()) return "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Please enter a valid email.";
    if (!form.company.trim()) return "Please enter your company name.";
    return null;
  }

  function onSubmit(e) {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error("Please check the form", { description: error });
      return;
    }

    toast.success("Request sent", {
      description: "Thanks! We’ll contact you shortly to schedule a walkthrough.",
    });

    setForm({ name: "", email: "", company: "", message: "" });
  }

  return (
    <section id="contact" className="py-20">
      <div className="container">
        <SectionHeader
          eyebrow="Contact"
          icon={Mail}
          title="Want to see PerformEdge in action?"
          description="Send a quick request or jump straight to the demo form."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Reveal>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Send a request</CardTitle>
                <CardDescription>We’ll reply with a demo time and walkthrough plan.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="grid gap-4">
                  <Field icon={Users} placeholder="Full Name" value={form.name} onChange={(v) => update("name", v)} />
                  <Field icon={Mail} placeholder="Work Email" value={form.email} onChange={(v) => update("email", v)} />
                  <Field icon={Building2} placeholder="Company Name" value={form.company} onChange={(v) => update("company", v)} />

                  <div className="relative">
                    <MessageSquare className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
                    <textarea
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="Message (optional)"
                      className="min-h-[120px] w-full rounded-2xl border border-border bg-background px-11 py-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Send Request
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.05}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Prefer the full demo form?</CardTitle>
                <CardDescription>
                  Use the detailed form page (industry, employees, contact number, etc.).
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <ListItem>Company & role details</ListItem>
                  <ListItem>Industry category & employee band</ListItem>
                  <ListItem>Country and contact number</ListItem>
                </div>

                {/* BUTTON SECTION */}
                <div className="mt-8 flex gap-4 flex-wrap">

                  <Link
                    to="/demo"
                    className={buttonClasses({ variant: "default", size: "lg" })}
                  >
                    Go to Demo Page
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    onClick={() => setShowDemo(true)}
                    className={buttonClasses({ variant: "default", size: "lg" })}>
                    <Play className="h-4 w-4" />
                    Watch Demo
                  </button>

                </div>

                <div className="mt-10 rounded-2xl border border-border bg-card p-4">
                  <div className="text-sm font-semibold">Tip</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Add your real data sources later to turn this MVP into a production HR intelligence tool.
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>

      {/* DEMO VIDEO POPUP */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDemo(false)}
          >
            <motion.div
              className="relative w-[90%] max-w-4xl rounded-2xl bg-background p-4 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >

              <button
                onClick={() => setShowDemo(false)}
                className="absolute right-3 top-3 rounded-full border border-border p-2"
              >
                <X className="h-4 w-4" />
              </button>

              <video
                controls
                autoPlay
                muted
                playsInline
                className="w-full rounded-lg">
                <source src="/assets/product-demo.mp4" type="video/mp4" />
              </video>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}

function Field({ icon: Icon, placeholder, value, onChange }) {
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

function Footer() {
  return (
    <footer id="about" className="border-t border-border bg-background">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-2">
          
          {/* Left Side */}
          <div>
            <div className="flex items-center gap-2 font-extrabold">
              <img
                src="/logo.png"
                alt="PerformEdge logo"
                className="h-14 w-14 rounded-2xl"
              />
              PerformEdge
            </div>

            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              PerformEdge is a centralized HR analytics dashboard MVP designed to deliver clear,
              real-time workforce insights through clean visual reporting.
            </p>
          </div>

          {/* Right Side - Contact Links */}
          <div className="grid gap-4 md:justify-end">
            <div className="text-sm font-semibold">Connect With Us</div>

            <div className="flex flex-col gap-3 text-sm text-muted-foreground">

              <a
                href="mailto:performedge.sdgp@gmail.com"
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                performedge.sdgp@gmail.com
              </a>

              <a
                href="https://www.linkedin.com/company/112172079/admin/dashboard/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>

              <a
                href="https://www.instagram.com/perform.edge/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </a>

            </div>
          </div>

        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>©️ {new Date().getFullYear()} PerformEdge. All rights reserved.</div>

          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
            Built as a practical analytics MVP
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function ProductPage() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showDemo, setShowDemo] = React.useState(false);

  return (
    <div className="min-h-screen">
<Header
  onOpenMobile={() => setMobileOpen(true)}
  onOpenDemo={() => setShowDemo(true)}
/>
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main>
        <Hero />
        <WhoItsFor />
        <Solution />
        <Features />
        <Analytics />
        <Learn />
        <Pricing />
        <Team />
        <Contact showDemo={showDemo} setShowDemo={setShowDemo} />
      </main>

      <Footer />
    </div>
  );
}