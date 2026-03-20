import axios from "axios";
import { vi } from "vitest";

export const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  create: () => any;
};

type ResponseShape = {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
  blob: () => Promise<Blob>;
  text: () => Promise<string>;
  headers: { get: (name: string) => string | null };
};

const defaultUser = {
  user_id: 1,
  user_name: "Test User",
  email: "test@example.com",
  company_id: "C001",
  company_name: "PerformEdge",
  role: "manager",
  roles: ["MANAGER"],
  employee_id: "E001",
  employee_code: "EMP-0001",
  full_name: "Test User",
  department: "Engineering",
  location: "Head Office",
};

function parseUrl(url: string) {
  try {
    return new URL(url, "http://localhost");
  } catch {
    return new URL("http://localhost");
  }
}

export function responseForUrl(url: string) {
  const normalized = String(url);
  const parsed = parseUrl(normalized);
  const query = parsed.searchParams.get("query") || parsed.searchParams.get("q") || "john";

  if (normalized.includes("/auth/login")) {
    return {
      access_token: "fake-token",
      token_type: "bearer",
      role: "manager",
      roles: ["MANAGER"],
      user: defaultUser,
    };
  }
  if (normalized.includes("/auth/signup")) return { message: "Signup successful", user_id: 1 };
  if (normalized.includes("/auth/send-otp")) return { message: "OTP sent to your email" };
  if (normalized.includes("/auth/change-password")) return { message: "Password changed successfully" };

  if (normalized.includes("/users/me")) return defaultUser;
  if (normalized.includes("/notifications/unread-count")) return { count: 2 };
  if (normalized.includes("/messages/unread-count")) return { count: 3 };
  if (normalized.includes("/notifications")) {
    return {
      items: [
        { notification_id: "N1", messages: "Welcome", is_read: 0, created_at: "2025-01-01T00:00:00" },
      ],
    };
  }
  if (normalized.includes("/messages/inbox") || normalized.includes("/messages/sent")) {
    return {
      items: [
        {
          message_id: "M1",
          subject: "Hello",
          body: "World",
          is_read: 0,
          created_at: "2025-01-01T00:00:00",
          sender_name: "Manager",
          sender_email: "manager@example.com",
          receiver_name: "Employee",
          receiver_email: "employee@example.com",
        },
      ],
    };
  }
  if (normalized.includes("/messages/send")) return { message_id: "M1" };
  if (normalized.includes("/search?")) {
    return {
      query,
      employees: [
        {
          employee_id: "E001",
          employee_code: "EMP-0001",
          name: "John Doe",
          full_name: "John Doe",
          email: "john@example.com",
          department: "Engineering",
          department_name: "Engineering",
          location: "Head Office",
          location_name: "Head Office",
          role: "Engineer",
          role_name: "Engineer",
        },
      ],
    };
  }
  if (normalized.includes("/meta/departments")) {
    return { items: [{ id: "D001", name: "Engineering", department_id: "D001", department_name: "Engineering" }] };
  }
  if (normalized.includes("/meta/locations")) {
    return { items: [{ id: "L001", name: "Head Office", location_id: "L001", location_name: "Head Office" }] };
  }

  if (normalized.includes("/dashboard/overview")) {
    return {
      cards: { total_employee: 10, new_employee: 2, on_leave: 1, over_time: 0 },
      charts: {
        gender: [{ label: "Male", value: 6 }, { label: "Female", value: 4 }],
        age: [{ label: "25-35", value: 4 }],
        employee_type: [{ label: "Permanent", value: 8 }],
        attendance: { present: 9, absent: 1 },
      },
      employee_performance: [{ name: "Alex", role: "Engineer", score: 88 }],
      calendar: [],
    };
  }

  if (normalized.includes("/attendance/latest-date")) {
    return { start: "2025-01-01", end: "2025-01-07", latest: "2025-01-07" };
  }
  if (normalized.includes("/attendance/summary")) {
    return {
      kpis: { present: 12, late: 2, on_leave: 1, over_time: 0 },
      late: [{ department_name: "Engineering", late_count: 2 }],
      no_pay: [{ department_name: "HR", no_pay_count: 1 }],
      absentee: [{ day: "2025-01-07", absent_count: 1 }],
      locations: [{ location_name: "Head Office", present: 10, absent: 1 }],
    };
  }
  if (normalized.includes("/attendance-trends/last-5-days")) {
    return [{ date: "2025-01-07", day: "Tue", absent: 1 }];
  }
  if (normalized.includes("/attendance-trends/avg-by-department")) {
    return [{ department_name: "Engineering", absenteeism_rate: 4.5, avg_absent: 1 }];
  }
  if (normalized.includes("/attendance-trends/daily-by-department")) {
    return {
      labels: ["Mon", "Tue"],
      datasets: [{ label: "Engineering", data: [1, 2] }],
    };
  }
  if (normalized.includes("/attendance-trends/dept-breakdown")) {
    return [{ department_name: "Engineering", absentee_count: 2 }];
  }

  if (normalized.includes("/attendance-location/kpis")) {
    return {
      totalEmployees: 25,
      presentToday: 22,
      absentToday: 2,
      remoteWorkers: 1,
    };
  }
  if (normalized.includes("/attendance-location/trend7days")) {
    return { labels: ["Mon", "Tue"], datasets: [{ label: "Head Office", data: [22, 21] }] };
  }
  if (normalized.includes("/attendance-location/summary")) {
    return [
      {
        location_id: "L001",
        name: "Head Office",
        present: 22,
        absent: 2,
        marked: 24,
        total_in_location: 25,
        attendance_rate: 88,
      },
    ];
  }

  if (normalized.includes("/no-pay/summary")) {
    return { total_days: 2, employees: 1, no_pay_percentage: 5.0, monthly_trend: "up" };
  }
  if (normalized.includes("/no-pay/by-department")) {
    return [{ department_name: "Engineering", no_pay_percentage: 5 }];
  }
  if (normalized.includes("/no-pay/distribution")) {
    return [{ department_name: "Engineering", days: 2 }];
  }
  if (normalized.includes("/no-pay/details")) {
    return [{ department_name: "Engineering", employee_name: "John Doe", no_pay_days: 2, no_pay_hours: 16, occurrences: 1 }];
  }

  if (normalized.includes("/latecomers/summary") || normalized.includes("/summary?")) {
    return { total_late: 4, avg_minutes: 11 };
  }
  if (normalized.includes("/7day-trend")) {
    return [{ label: "Mon", value: 1 }];
  }
  if (normalized.includes("/by-department")) {
    return [{ department_name: "Engineering", count: 2, late_count: 2, no_pay_days: 1 }];
  }

  if (normalized.includes("/performance/overview")) {
    return {
      stats: {
        averageScore: 86,
        excellenceRate: 35,
        needsImprovement: 2,
        topPerformers: 3,
        totalEmployees: 10,
        employeesNeedTraining: 4,
        topTrainingCategory: "Technical",
        avgTrainingCompletion: 72,
        appraisalsCompleted: 7,
        pendingAppraisals: 3,
        completionRate: 70,
      },
      ranking_chart: [{ name: "Excellent", value: 40 }],
      training_bars: [{ name: "Technical", value: 45 }],
      appraisals_chart: [{ name: "Completed", value: 70 }],
      ranking: [],
      training: [],
      appraisals: [],
    };
  }
  if (normalized.includes("/performance/ranking")) {
    return {
      stats: {
        averageScore: 86,
        excellenceRate: 35,
        needsImprovement: 2,
        topPerformers: 3,
      },
      chart: [{ name: "Excellent", value: 40, color: "#3C9A5F" }],
      employees: [{ name: "John Doe", department: "Engineering", percentage: 88, rating: "Excellent" }],
    };
  }
  if (normalized.includes("/performance/training")) {
    return {
      stats: {
        totalEmployees: 10,
        employeesNeedTraining: 4,
        topTrainingCategory: "Technical",
        avgTrainingCompletion: 72,
      },
      bars: [{ name: "Technical", value: 45 }],
      table: [{ name: "John Doe", department: "Engineering", technical: 80, softSkills: 70, leadership: 60, compliance: 90, total: 75 }],
    };
  }
  if (normalized.includes("/performance/appraisals")) {
    return {
      stats: {
        totalEmployees: 10,
        appraisalsCompleted: 7,
        pendingAppraisals: 3,
        completionRate: 70,
      },
      chart: [{ name: "Completed", value: 70 }],
      rows: [{ name: "John Doe", department: "Engineering", status: "Completed", score: 88, completionPct: 100 }],
    };
  }

  if (normalized.includes("/eim/dashboard")) {
    return {
      kpis: { total: 10, joiners: 2, resigned: 1, avgYears: 4.2 },
      charts: {
        gender: [{ label: "Male", value: 6 }],
        age: [{ label: "25-35", value: 4 }],
        staffTrend: { labels: ["Jan"], joiners: [1], resignations: [0] },
        location: [{ label: "Head Office", value: 8 }],
      },
      birthdays: [],
    };
  }
  if (normalized.includes("/service-year-analysis")) {
    return {
      chart: { labels: ["0-1", "2-5"], values: [2, 5] },
      loyalty_index: 72,
      top_long_serving: [{ name: "Jane Doe", years: 8 }],
      staff: [{ name: "Jane Doe", department: "Engineering", years: "8" }],
    };
  }
  if (normalized.includes("/gender-analysis")) {
    return {
      summary: { male: 6, female: 4 },
      total: 10,
      employees: [{ full_name: "John Doe", department_name: "Engineering", gender: "Male" }],
    };
  }
  if (normalized.includes("/age-analysis")) {
    return {
      distribution: [{ label: "25-35", total: 4, male: 2, female: 2 }],
      table: [{ name: "John Doe", age: 30, department: "Engineering" }],
    };
  }
  if (normalized.includes("/staff-analysis")) {
    return {
      kpis: { total_staff: 10, new_joiners: 2, resigned_staff: 1, pending_recruit: 3 },
      trend: { months: ["Jan"], new_joiners: [2], resigned: [1] },
      distribution: { new_joiners: 2, current_staff: 10, resigned: 1 },
      new_joiners_list: [{ name: "John Doe", department: "Engineering", date: "2025-01-01" }],
      resigned_list: [{ name: "Jane Doe", department: "HR", date: "2025-01-03" }],
    };
  }
  if (normalized.includes("/contract-type-distribution")) {
    return {
      kpis: { total: 10, permanent: 6, contract: 1, consultants: 2, probation: 1 },
      summary: [
        { type: "Permanent", percentage: 60 },
        { type: "Consultants", percentage: 20 },
        { type: "Probation", percentage: 10 },
      ],
      employees: [{ name: "John Doe", department: "Engineering", contract: "Permanent" }],
    };
  }
  if (normalized.includes("/category-distribution")) {
    return {
      labels: ["Academic"],
      values: [10],
      total_staff: 10,
      summary: [{ type: "Academic", percentage: 100 }],
      employees: [{ name: "John Doe", department: "Engineering", category: "Academic" }],
    };
  }
  if (normalized.includes("/location-wise-staff")) {
    return {
      kpis: { max_location: "Head Office", min_location: "Branch Office", total_staff: 10, total_locations: 2 },
      chart: [{ location: "Head Office", count: 10 }],
      employees: [{ name: "John Doe", department: "Engineering", location: "Head Office" }],
    };
  }
  if (normalized.includes("/upcoming-birthdays")) {
    return {
      highlights: [{ name: "John Doe", department: "Engineering", date: "2025-01-10" }],
      table: [{ name: "John Doe", department: "Engineering", birthday: "1990-01-10", days_left: "2", tag: "This Week" }],
    };
  }

  if (normalized.includes("/employee/dashboard/overview")) {
    return {
      employee: defaultUser,
      leave: {
        year: 2025,
        total_entitled: 28,
        used: 4,
        remaining: 24,
        pending_requests: 1,
        next_approved_leave: "2025-02-10",
        by_type: [{ leave_type: "Annual", total: 14, used: 2, remaining: 12 }],
      },
      performance: {
        latest_score: 88,
        latest_rating: "Excellent",
        latest_review_date: "2025-01-01",
        latest_comments: "Great work",
        trend: [{ cycle_name: "2025 Q1", score: 88, rating: "Excellent" }],
        criteria: [{ criteria: "Quality", score: 90, max_score: 100 }],
      },
      training: { recommended: 2, requested: 1, total: 3 },
      new_joiners: [{ full_name: "New Hire", department: "Engineering", join_date: "2025-01-01" }],
      birthdays: [{ full_name: "Birthday Person", days_until: 2, birth_date: "1990-01-10" }],
    };
  }
  if (normalized.includes("/employee/leave/summary")) {
    return {
      year: 2025,
      total_entitled: 28,
      used: 4,
      remaining: 24,
      pending_requests: 1,
      next_approved_leave: "2025-02-10",
      by_type: [{ leave_type: "Annual", total: 14, used: 2, remaining: 12 }],
    };
  }
  if (normalized.includes("/employee/leave/records")) {
    return {
      records: [
        {
          leave_record_id: "LR1",
          leave_type: "Annual",
          start_date: "2025-02-10",
          end_date: "2025-02-12",
          days: 3,
          status: "APPROVED",
          reason: "Vacation",
        },
      ],
    };
  }
  if (normalized.includes("/employee/leave/request")) return { ok: true, leave_record_id: "LR1" };
  if (normalized.includes("/employee/performance/summary")) {
    return {
      latest: {
        score: 88,
        rating: "Excellent",
        cycle_name: "2025 Q1",
        review_date: "2025-01-10",
        comments: "Great work",
      },
      history: [{ cycle_name: "2025 Q1", score: 88, rating: "Excellent" }],
      criteria: [{ criteria: "Quality", score: 90, max_score: 100 }],
    };
  }
  if (normalized.includes("/employee/new-joiners")) {
    return { new_joiners: [{ full_name: "New Hire", join_date: "2025-01-01", department: "Engineering" }] };
  }
  if (normalized.includes("/employee/birthdays")) {
    return { birthdays: [{ full_name: "Birthday Person", birth_date: "1990-01-10", days_until: 2 }] };
  }

  return {
    items: [],
    cards: { total_employee: 0, new_employee: 0, on_leave: 0, over_time: 0 },
    charts: { gender: [], age: [], employee_type: [], attendance: { present: 0, absent: 0 } },
    employee_performance: [],
    records: [],
    rows: [],
    chart: [],
    table: [],
    stats: {},
  };
}

function makeResponse(payload: any, ok = true, status = 200): ResponseShape {
  return {
    ok,
    status,
    json: async () => payload,
    blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
    text: async () => JSON.stringify(payload),
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-disposition' ? 'attachment; filename="report.pdf"' : null),
    },
  };
}

export function installMockApiSuccess() {
  global.fetch = vi.fn(async (input: any) => makeResponse(responseForUrl(String(input))));
  mockedAxios.get = vi.fn(async (url: string) => ({ data: responseForUrl(String(url)) }));
  mockedAxios.post = vi.fn(async (url: string) => ({ data: responseForUrl(String(url)) }));
  mockedAxios.put = vi.fn(async (url: string) => ({ data: responseForUrl(String(url)) }));
  mockedAxios.delete = vi.fn(async (url: string) => ({ data: responseForUrl(String(url)) }));
  mockedAxios.create = () => mockedAxios;
}

export function installMockApiFailure() {
  global.fetch = vi.fn(async () => {
    throw new Error("Network error");
  });
  mockedAxios.get = vi.fn(async () => {
    throw new Error("Network error");
  });
  mockedAxios.post = vi.fn(async () => {
    throw new Error("Network error");
  });
  mockedAxios.put = vi.fn(async () => {
    throw new Error("Network error");
  });
  mockedAxios.delete = vi.fn(async () => {
    throw new Error("Network error");
  });
  mockedAxios.create = () => mockedAxios;
}
