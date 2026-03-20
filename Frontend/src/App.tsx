import * as React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ThemeProvider, useTheme } from "@/context/theme";
import { ThemeToggleFab } from "@/components/ThemeToggle";
import { Toaster } from "@/components/ui/sonner";

import ProductPage from "@/pages/public/ProductPage";
import DemoPage from "@/pages/public/DemoPage";

// Auth pages
import LoginPage from "@/pages/Login/LoginPage";
import SignupPage from "@/pages/Signup/SignupPage";
import ForgetPasswordPage from "@/pages/Login/ForgetPasswordPage";

// Dashboard (nested)
import DashboardLayout from "@/pages/Dashboard/DashboardLayout";
import Overview from "@/pages/Dashboard/Overview";
import SearchPage from "@/pages/Dashboard/SearchPage";
import NotificationsPage from "@/pages/Dashboard/NotificationsPage";
import MessagesPage from "@/pages/Dashboard/MessagesPage";
import ManagerProfilePage from "@/pages/Dashboard/ManagerProfilePage";

import AttendancePage from "@/pages/Dashboard/Attendance/AttendancePage";
import AttendanceTrendsPage from "@/pages/Dashboard/Attendance/AttendanceTrendsPage";
import LatecomersAnalysisPage from "@/pages/Dashboard/Attendance/LatecomersAnalysisPage";
import NoPayLeavePercentagePage from "@/pages/Dashboard/Attendance/NoPayLeavePercentagePage";
import AttendanceByLocationPage from "@/pages/Dashboard/Attendance/AttendanceByLocationPage";

import EIMPage from "@/pages/Dashboard/EIM/EIMPage";
import ServiceYearAnalysisPage from "@/pages/Dashboard/EIM/ServiceYearAnalysisPage";
import GenderAnalysisPage from "@/pages/Dashboard/EIM/GenderAnalysisPage";
import AgeAnalysisPage from "@/pages/Dashboard/EIM/AgeAnalysisPage";
import StaffAnalysisPage from "@/pages/Dashboard/EIM/StaffAnalysisPage";
import UpcomingBirthdaysPage from "@/pages/Dashboard/EIM/UpcomingBirthdaysPage";
import ContractTypeDistributionPage from "@/pages/Dashboard/EIM/ContractTypeDistributionPage";
import CategoryDistributionPage from "@/pages/Dashboard/EIM/CategoryDistributionPage";
import LocationWiseStaffDistributionPage from "@/pages/Dashboard/EIM/LocationWiseStaffDistributionPage";

import PerformancePage from "@/pages/Dashboard/Performance/PerformancePage";
import RankingDistributionPage from "@/pages/Dashboard/Performance/RankingDistributionPage";
import TrainingNeedsDistributionPage from "@/pages/Dashboard/Performance/TrainingNeedsDistributionPage";
import AppraisalCompletionStatusPage from "@/pages/Dashboard/Performance/AppraisalCompletionStatusPage";

// Employee Dashboard (nested)
import EmployeeDashboardLayout from "@/pages/EmployeeDashboard/EmployeeDashboardLayout";
import EmployeeOverview from "@/pages/EmployeeDashboard/EmployeeOverview";
import MyLeaveStatusPage from "@/pages/EmployeeDashboard/MyLeaveStatusPage";
import MyPerformancePage from "@/pages/EmployeeDashboard/MyPerformancePage";
import NewJoinersPage from "@/pages/EmployeeDashboard/NewJoinersPage";
import EmployeeBirthdaysPage from "@/pages/EmployeeDashboard/EmployeeBirthdaysPage";
import MyProfilePage from "@/pages/EmployeeDashboard/MyProfilePage";
import EmployeeSearchPage from "@/pages/EmployeeDashboard/EmployeeSearchPage";
import EmployeeNotificationsPage from "@/pages/EmployeeDashboard/EmployeeNotificationsPage";
import EmployeeMessagesPage from "@/pages/EmployeeDashboard/EmployeeMessagesPage";

// Not Found
import NotFoundPage from "@/pages/NotFoundPage";

function AppRoutes() {
  const { theme } = useTheme();

  return (
    <>
      <Toaster theme={theme} />

      <BrowserRouter>
        <Routes>
          {/* public */}
          {/* Default route goes to login to avoid blank screen if ProductPage has optional deps */}
          <Route path="/" element={<ProductPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/demo" element={<DemoPage />} />

          {/* auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forget-password" element={<ForgetPasswordPage />} />

          {/* friendly aliases */}
          <Route path="/employee-dashboard" element={<Navigate to="/employee" replace />} />
          <Route path="/hr-dashboard" element={<Navigate to="/dashboard" replace />} />

          {/* employee dashboard (nested routes) */}
          <Route path="/employee" element={<EmployeeDashboardLayout />}>
            <Route index element={<EmployeeOverview />} />
            <Route path="my-leave" element={<MyLeaveStatusPage />} />
            <Route path="my-performance" element={<MyPerformancePage />} />
            <Route path="new-joiners" element={<NewJoinersPage />} />
            <Route path="birthdays" element={<EmployeeBirthdaysPage />} />
            <Route path="profile" element={<MyProfilePage />} />
            <Route path="search" element={<EmployeeSearchPage />} />
            <Route path="notifications" element={<EmployeeNotificationsPage />} />
            <Route path="messages" element={<EmployeeMessagesPage />} />
          </Route>

          {/* dashboard (nested routes) */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />

            {/* Utility */}
            <Route path="search" element={<SearchPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="profile" element={<ManagerProfilePage />} />

            {/* EIM */}
            <Route path="eim" element={<EIMPage />} />
            <Route
              path="eim/service-year-analysis"
              element={<ServiceYearAnalysisPage />}
            />
            <Route path="eim/gender-analysis" element={<GenderAnalysisPage />} />
            <Route path="eim/age-analysis" element={<AgeAnalysisPage />} />
            <Route path="eim/staff-analysis" element={<StaffAnalysisPage />} />
            <Route
              path="eim/upcoming-birthdays"
              element={<UpcomingBirthdaysPage />}
            />
            <Route
              path="eim/contract-type-distribution"
              element={<ContractTypeDistributionPage />}
            />
            <Route
              path="eim/category-distribution"
              element={<CategoryDistributionPage />}
            />
            <Route
              path="eim/location-wise-staff-distribution"
              element={<LocationWiseStaffDistributionPage />}
            />

            {/* Attendance */}
            <Route path="attendance" element={<AttendancePage />} />
            <Route
              path="attendance/trends"
              element={<AttendanceTrendsPage />}
            />
            <Route
              path="attendance/latecomers-analysis"
              element={<LatecomersAnalysisPage />}
            />
            <Route
              path="attendance/no-pay-leave-percentage"
              element={<NoPayLeavePercentagePage />}
            />
            <Route
              path="attendance/by-location"
              element={<AttendanceByLocationPage />}
            />

            {/* Performance */}
            <Route path="performance" element={<PerformancePage />} />
            <Route
              path="performance/ranking-distribution"
              element={<RankingDistributionPage />}
            />
            <Route
              path="performance/training-needs-distribution"
              element={<TrainingNeedsDistributionPage />}
            />
            <Route
              path="performance/appraisal-completion-status"
              element={<AppraisalCompletionStatusPage />}
            />
          </Route>

          {/* fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        <ThemeToggleFab />
      </BrowserRouter>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AppRoutes />
    </ThemeProvider>
  );
}
