
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE `attendance_records` (
  `attendance_id` varchar(255) NOT NULL,
  `employee_id` varchar(255) DEFAULT NULL,
  `date_of_attendance` date DEFAULT NULL,
  `status_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `attendance_records`

INSERT INTO `attendance_records` (`attendance_id`, `employee_id`, `date_of_attendance`, `status_id`) VALUES
('AR001', 'E001', '2025-02-26', 'AS001'),
('AR002', 'E002', '2025-02-26', 'AS003'),
('AR003', 'E003', '2025-02-26', 'AS001'),
('AR004', 'E004', '2025-02-26', 'AS002'),
('AR005', 'E005', '2025-02-26', 'AS004'),
('AR006', 'E006', '2025-02-26', 'AS005'),
('AR007', 'E007', '2025-02-26', 'AS006'),
('AR008', 'E008', '2025-02-26', 'AS008'),
('AR009', 'E009', '2025-02-26', 'AS006'),
('AR010', 'E010', '2025-02-26', 'AS001'),
('AR011', 'E001', '2025-02-25', 'AS003'),
('AR012', 'E004', '2025-02-25', 'AS003'),
('AR013', 'E005', '2025-02-24', 'AS003'),
('AR014', 'E006', '2025-02-24', 'AS002'),
('AR015', 'E010', '2025-02-23', 'AS003'),
('AR016', 'E002', '2025-02-22', 'AS003');

-- Table structure for table `attendance_sessions`

CREATE TABLE `attendance_sessions` (
  `session_id` varchar(255) NOT NULL,
  `attendance_id` varchar(255) DEFAULT NULL,
  `check_in` time DEFAULT NULL,
  `check_out` time DEFAULT NULL,
  `hours_worked` decimal(5,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `attendance_sessions`

INSERT INTO `attendance_sessions` (`session_id`, `attendance_id`, `check_in`, `check_out`, `hours_worked`) VALUES
('ATS001', 'AR001', '09:00:00', '17:00:00', 8.00),
('ATS002', 'AR002', '09:25:00', '17:35:00', 7.58),
('ATS003', 'AR003', '14:35:00', '17:45:00', 3.17),
('ATS004', 'AR004', NULL, NULL, 0.00),
('ATS005', 'AR005', '09:00:00', '13:00:00', 4.00),
('ATS006', 'AR006', '09:00:00', '17:00:00', 8.00),
('ATS007', 'AR007', '09:00:00', '17:00:00', 8.00),
('ATS008', 'AR008', '09:30:00', '17:00:00', 7.50),
('ATS009', 'AR009', '09:00:00', '17:00:00', 8.00),
('ATS010', 'AR010', '09:00:00', '17:00:00', 8.00);

-- Table structure for table `attendance_status_type`

CREATE TABLE `attendance_status_type` (
  `status_id` varchar(255) NOT NULL,
  `company_id` varchar(255) DEFAULT NULL,
  `status_name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `attendance_status_type`

INSERT INTO `attendance_status_type` (`status_id`, `company_id`, `status_name`) VALUES
('AS001', 'C001', 'Present'),
('AS002', 'C001', 'Absent'),
('AS003', 'C001', 'Late'),
('AS004', 'C001', 'Half-Day'),
('AS005', 'C001', 'Work From Home'),
('AS006', 'C002', 'Present'),
('AS007', 'C002', 'Absent'),
('AS008', 'C002', 'Late'),
('AS009', 'C002', 'Half-Day'),
('AS010', 'C002', 'Work From Home');

-- Table structure for table `companies`

CREATE TABLE `companies` (
  `company_id` varchar(255) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `industry` varchar(255) NOT NULL,
  `company_size` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `companies`

INSERT INTO `companies` (`company_id`, `company_name`, `industry`, `company_size`) VALUES
('C001', 'Company 1', 'IT Services', '200'),
('C002', 'Company 2', 'Software', '150');

-- Table structure for table `companies_settings`

CREATE TABLE `companies_settings` (
  `setting_id` varchar(255) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `setting_key` varchar(255) NOT NULL,
  `setting_value` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `companies_settings`

INSERT INTO `companies_settings` (`setting_id`, `company_id`, `setting_key`, `setting_value`) VALUES
('CS001', 'C001', 'timezone', 'UTC'),
('CS002', 'C001', 'currency', 'USD'),
('CS003', 'C001', 'theme', 'dark'),
('CS004', 'C001', 'week_start', 'MONDAY'),
('CS005', 'C001', 'country', 'Sri Lanka'),
('CS006', 'C002', 'timezone', 'IST'),
('CS007', 'C002', 'currency', 'INR'),
('CS008', 'C002', 'theme', 'light'),
('CS009', 'C002', 'week_start', 'MONDAY'),
('CS010', 'C002', 'country', 'India');

-- Table structure for table `departments`

CREATE TABLE `departments` (
  `department_id` varchar(255) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `department_name` varchar(255) NOT NULL,
  `parent_department_id` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `departments`

INSERT INTO `departments` (`department_id`, `company_id`, `department_name`, `parent_department_id`, `status`) VALUES
('D001', 'C001', 'HR', NULL, 'ACTIVE'),
('D002', 'C001', 'Engineering', NULL, 'ACTIVE'),
('D003', 'C001', 'Sales', NULL, 'ACTIVE'),
('D004', 'C001', 'Finance', NULL, 'ACTIVE'),
('D005', 'C001', 'Operations', NULL, 'ACTIVE'),
('D006', 'C002', 'HR', NULL, 'ACTIVE'),
('D007', 'C002', 'Engineering', NULL, 'ACTIVE'),
('D008', 'C002', 'Sales', NULL, 'ACTIVE'),
('D009', 'C002', 'Marketing', NULL, 'ACTIVE'),
('D010', 'C002', 'Finance', NULL, 'ACTIVE');

-- Table structure for table `employees`

CREATE TABLE `employees` (
  `employee_id` varchar(255) NOT NULL,
  `company_id` varchar(255) DEFAULT NULL,
  `department_id` varchar(255) DEFAULT NULL,
  `job_role_id` varchar(255) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `location_id` varchar(255) DEFAULT NULL,
  `employee_code` varchar(255) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `category` varchar(50) NOT NULL,
  `join_date` date DEFAULT NULL,
  `retired_date` date DEFAULT NULL,
  `employement_status` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `employees`

INSERT INTO `employees` (`employee_id`, `company_id`, `department_id`, `job_role_id`, `user_id`, `location_id`, `employee_code`, `full_name`, `gender`, `date_of_birth`, `category`, `join_date`, `retired_date`, `employement_status`) VALUES
('E001', 'C001', 'D002', 'JR002', 3, 'L001', 'EMP001', 'John Doe', 'Male', '1998-05-10', 'Academic', '2023-01-01', NULL, 'ACTIVE'),
('E002', 'C001', 'D002', 'JR003', 4, 'L001', 'EMP002', 'Jane Silva', 'Female', '1997-02-12', 'Administrative', '2023-02-01', '2026-02-15', 'INACTIVE'),
('E003', 'C001', 'D001', 'JR001', 2, 'L001', 'EMP003', 'Robert Brown', 'Male', '1990-01-20', 'Administrative', '2026-01-15', NULL, 'ACTIVE'),
('E004', 'C001', 'D003', 'JR004', 5, 'L002', 'EMP004', 'Nimal Perera', 'Male', '1995-06-14', 'Administrative', '2023-04-01', NULL, 'ACTIVE'),
('E005', 'C001', 'D004', 'JR005', 6, 'L001', 'EMP005', 'Sanduni Jay', 'Female', '1996-11-08', 'Administrative', '2023-05-01', NULL, 'ACTIVE'),
('E006', 'C001', 'D005', 'JR005', 7, 'L003', 'EMP006', 'Kamal Fernando', 'Male', '1993-09-09', 'Administrative', '2023-06-01', NULL, 'ACTIVE'),
('E007', 'C002', 'D007', 'JR007', 10, 'L006', 'EMP007', 'Disadhi Niselka', 'Male', '1998-03-03', 'Academic', '2024-01-01', NULL, 'ACTIVE'),
('E008', 'C002', 'D006', 'JR006', 9, 'L006', 'EMP008', 'Osandi Ranadeniya', 'Female', '1992-04-04', 'Administrative', '2024-01-05', NULL, 'ACTIVE'),
('E009', 'C002', 'D008', 'JR008', 8, 'L007', 'EMP009', 'Achira Vithranagae', 'Male', '1988-07-07', 'Administrative', '2024-01-10', NULL, 'ACTIVE'),
('E010', 'C001', 'D002', 'JR002', 1, 'L001', 'EMP010', 'Kavidu Perera', 'Male', '1985-01-01', 'Administrative', '2021-01-10', NULL, 'ACTIVE');

-- Table structure for table `employment_contract`

CREATE TABLE `employment_contract` (
  `contract_id` varchar(255) NOT NULL,
  `employee_id` varchar(255) DEFAULT NULL,
  `contract_type` varchar(100) DEFAULT NULL,
  `started_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_current` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `employment_contract`

INSERT INTO `employment_contract` (`contract_id`, `employee_id`, `contract_type`, `started_date`, `end_date`, `is_current`) VALUES
('EC001', 'E001', 'Full-Time', '2023-01-01', NULL, 1),
('EC002', 'E002', 'Full-Time', '2023-02-01', NULL, 1),
('EC003', 'E003', 'Full-Time', '2022-03-15', NULL, 1),
('EC004', 'E004', 'Full-Time', '2023-04-01', NULL, 1),
('EC005', 'E005', 'Full-Time', '2023-05-01', NULL, 1),
('EC006', 'E006', 'Intern', '2023-06-01', '2024-06-01', 0),
('EC007', 'E007', 'Full-Time', '2024-01-01', NULL, 1),
('EC008', 'E008', 'Full-Time', '2024-01-05', NULL, 1),
('EC009', 'E009', 'Full-Time', '2024-01-10', NULL, 1),
('EC010', 'E010', 'Full-Time', '2021-01-01', NULL, 1);

-- Table structure for table `job_roles`

CREATE TABLE `job_roles` (
  `job_role_id` varchar(255) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `role_name` varchar(255) NOT NULL,
  `role_level` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `job_roles`

INSERT INTO `job_roles` (`job_role_id`, `company_id`, `role_name`, `role_level`) VALUES
('JR001', 'C001', 'HR Manager', 3),
('JR002', 'C001', 'Software Engineer', 2),
('JR003', 'C001', 'QA Engineer', 2),
('JR004', 'C001', 'Sales Executive', 2),
('JR005', 'C001', 'Accountant', 2),
('JR006', 'C002', 'HR Manager', 3),
('JR007', 'C002', 'Software Engineer', 2),
('JR008', 'C002', 'Sales Executive', 2),
('JR009', 'C002', 'Marketing Exec', 2),
('JR010', 'C002', 'Accountant', 2);

-- Table structure for table `leave_entitlements`

CREATE TABLE `leave_entitlements` (
  `employee_id` varchar(10) NOT NULL,
  `leave_type` varchar(50) NOT NULL,
  `total_days` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `leave_entitlements`

INSERT INTO `leave_entitlements` (`employee_id`, `leave_type`, `total_days`) VALUES
('E001', 'Annual', 14),
('E001', 'Casual', 7),
('E001', 'Sick', 7),
('E002', 'Annual', 14),
('E002', 'Casual', 7),
('E002', 'Sick', 7),
('E003', 'Annual', 14),
('E003', 'Casual', 7),
('E003', 'Sick', 7),
('E004', 'Annual', 14),
('E004', 'Casual', 7),
('E004', 'Sick', 7),
('E005', 'Annual', 14),
('E005', 'Casual', 7),
('E005', 'Sick', 7),
('E006', 'Annual', 14),
('E006', 'Casual', 7),
('E006', 'Sick', 7),
('E007', 'Annual', 14),
('E007', 'Casual', 7),
('E007', 'Sick', 7),
('E008', 'Annual', 14),
('E008', 'Casual', 7),
('E008', 'Sick', 7),
('E009', 'Annual', 14),
('E009', 'Casual', 7),
('E009', 'Sick', 7),
('E010', 'Annual', 14),
('E010', 'Casual', 7),
('E010', 'Sick', 7);

-- Table structure for table `leave_records`

CREATE TABLE `leave_records` (
  `leave_id` varchar(255) NOT NULL,
  `employee_id` varchar(255) DEFAULT NULL,
  `leave_type` text DEFAULT NULL,
  `started_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `leave_status` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table `leave_records`

INSERT INTO `leave_records` (`leave_id`, `employee_id`, `leave_type`, `started_date`, `end_date`, `reason`, `leave_status`) VALUES
('LR001', 'E001', 'Annual Leave', '2025-02-01', '2025-02-05', 'Vacation', 'APPROVED'),
('LR002', 'E002', 'Sick Leave', '2025-02-10', '2025-02-26', 'Fever', 'APPROVED'),
('LR003', 'E003', 'Annual Leave', '2025-03-01', '2025-03-02', 'Family', 'PENDING'),
('LR004', 'E004', 'Casual Leave', '2025-03-05', '2025-03-05', 'Personal', 'APPROVED'),
('LR005', 'E005', 'Annual Leave', '2025-04-01', '2025-04-03', 'Trip', 'APPROVED'),
('LR006', 'E006', 'Sick Leave', '2025-04-10', '2025-04-11', 'Flu', 'APPROVED'),
('LR007', 'E007', 'Annual Leave', '2025-05-01', '2025-05-03', 'Trip', 'PENDING'),
('LR008', 'E008', 'Casual Leave', '2025-05-10', '2025-05-10', 'Errand', 'APPROVED'),
('LR009', 'E009', 'Sick Leave', '2025-06-01', '2025-06-01', 'Cold', 'APPROVED'),
('LR010', 'E010', 'Annual Leave', '2025-06-05', '2025-06-06', 'Personal', 'APPROVED'),
('LR011', 'E001', 'No Pay Leave', '2025-02-20', '2025-02-20', 'Unpaid day', 'APPROVED'),
('LR012', 'E002', 'No Pay Leave', '2025-02-21', '2025-02-22', 'Unpaid leave', 'APPROVED'),
('LR013', 'E004', 'No Pay Leave', '2025-02-23', '2025-02-23', 'Personal unpaid', 'APPROVED'),
('LR014', 'E005', 'No Pay Leave', '2025-02-24', '2025-02-25', 'Unpaid leave', 'APPROVED'),
('LR015', 'E006', 'No Pay Leave', '2025-02-26', '2025-02-26', 'No-pay day', 'APPROVED'),
('LR016', 'E010', 'No Pay Leave', '2025-02-25', '2025-02-25', 'Unpaid leave', 'APPROVED');

-- Table structure for table `locations`

CREATE TABLE `locations` (
  `location_id` varchar(255) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `location_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Dumping data for table `locations`

INSERT INTO `locations` (`location_id`, `company_id`, `location_name`) VALUES
('L001', 'C001', 'Location 1'),
('L002', 'C001', 'Location 2'),
('L003', 'C001', 'Location 3'),
('L004', 'C001', 'Location 4'),
('L005', 'C001', 'Location 5'),
('L006', 'C002', 'Location 1'),
('L007', 'C002', 'Location 2'),
('L008', 'C002', 'Location 3'),
('L009', 'C002', 'Location 4'),
('L010', 'C002', 'Location 5');

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `message_id` varchar(100) NOT NULL,
  `sender_user_id` int(11) NOT NULL,
  `receiver_user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL,
  `is_read` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`message_id`, `sender_user_id`, `receiver_user_id`, `subject`, `body`, `created_at`, `is_read`) VALUES
('M001', 2, 3, 'Welcome to PerformEdge', 'Hi Employee One, welcome to the platform.', '2025-01-15 09:00:00', 0),
('M002', 3, 2, 'Re: Welcome to PerformEdge', 'Thank you! Happy to be here.', '2025-01-15 09:30:00', 1),
('M003', 2, 4, 'Training Request', 'Please submit your training plan for Q1.', '2025-01-18 10:00:00', 0),
('M004', 4, 2, 'Re: Training Request', 'Sure, I will send it by tomorrow.', '2025-01-18 11:15:00', 0),
('M005', 2, 5, 'Performance Review Reminder', 'Reminder: Please complete your self-evaluation.', '2025-01-20 08:45:00', 0);

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `messages` text NOT NULL,
  `created_at` datetime NOT NULL,
  `is_read` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `messages`, `created_at`, `is_read`) VALUES
('N001', 3, 'Performance review completed', '2025-01-20 10:00:00', 0),
('N002', 4, 'Training requested', '2025-01-21 11:00:00', 0),
('N003', 5, 'Leave approved', '2025-01-22 12:00:00', 1),
('N004', 6, 'Attendance late marked', '2025-01-23 13:00:00', 0),
('N005', 7, 'Appraisal pending', '2025-01-24 14:00:00', 0),
('N006', 8, 'Report generated', '2025-01-25 15:00:00', 1),
('N007', 9, 'System update', '2025-01-26 16:00:00', 1),
('N008', 10, 'Welcome', '2025-01-27 17:00:00', 1),
('N009', 2, 'New employee added', '2025-01-28 18:00:00', 0),
('N010', 1, 'Database initialized', '2025-01-29 19:00:00', 1);

--
-- Table structure for table `notification_preferences`
--

CREATE TABLE `notification_preferences` (
  `notification_pref_id` varchar(100) NOT NULL,
  `notification_id` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email_enabled` tinyint(1) DEFAULT 1,
  `sms_enabled` tinyint(1) DEFAULT 0,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_preferences`
--

INSERT INTO `notification_preferences` (`notification_pref_id`, `notification_id`, `user_id`, `email_enabled`, `sms_enabled`, `updated_at`) VALUES
('NP001', 'N001', 3, 1, 0, '2026-03-12 20:08:46'),
('NP002', 'N002', 4, 1, 0, '2026-03-12 20:08:46'),
('NP003', 'N003', 5, 1, 0, '2026-03-12 20:08:46'),
('NP004', 'N004', 6, 1, 0, '2026-03-12 20:08:46'),
('NP005', 'N005', 7, 1, 0, '2026-03-12 20:08:46'),
('NP006', 'N006', 8, 1, 0, '2026-03-12 20:08:46'),
('NP007', 'N007', 9, 1, 0, '2026-03-12 20:08:46'),
('NP008', 'N008', 10, 1, 0, '2026-03-12 20:08:46'),
('NP009', 'N009', 2, 1, 0, '2026-03-12 20:08:46'),
('NP010', 'N010', 1, 1, 0, '2026-03-12 20:08:46');

--
-- Table structure for table `performance_appraisals`
--

CREATE TABLE `performance_appraisals` (
  `appraisal_id` varchar(50) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `cycle_id` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL,
  `completed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `performance_appraisals`
--

INSERT INTO `performance_appraisals` (`appraisal_id`, `company_id`, `employee_id`, `cycle_id`, `status`, `completed_at`) VALUES
('PA001', 'C001', 'E001', 'PC001', 'COMPLETED', '2025-01-25 12:00:00'),
('PA002', 'C001', 'E002', 'PC001', 'COMPLETED', '2025-01-25 12:05:00'),
('PA003', 'C001', 'E003', 'PC001', 'PENDING', NULL),
('PA004', 'C001', 'E004', 'PC001', 'PENDING', NULL),
('PA005', 'C001', 'E005', 'PC001', 'COMPLETED', '2025-01-25 12:10:00'),
('PA006', 'C001', 'E006', 'PC001', 'COMPLETED', '2025-01-25 12:15:00'),
('PA007', 'C002', 'E007', 'PC006', 'COMPLETED', '2025-01-26 10:00:00'),
('PA008', 'C002', 'E008', 'PC006', 'PENDING', NULL),
('PA009', 'C002', 'E009', 'PC006', 'COMPLETED', '2025-01-26 10:05:00'),
('PA010', 'C001', 'E010', 'PC001', 'COMPLETED', '2025-01-25 12:20:00');

--
-- Table structure for table `performance_criteria`
--

CREATE TABLE `performance_criteria` (
  `criteria_id` varchar(255) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `criteria_name` varchar(255) NOT NULL,
  `weight` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `performance_criteria`
--

INSERT INTO `performance_criteria` (`criteria_id`, `company_id`, `criteria_name`, `weight`) VALUES
('CR001', 'C001', 'Technical Skills', 40),
('CR002', 'C001', 'Communication', 30),
('CR003', 'C001', 'Teamwork', 30),
('CR004', 'C001', 'Delivery Quality', 25),
('CR005', 'C001', 'Leadership', 25),
('CR006', 'C002', 'Technical Skills', 40),
('CR007', 'C002', 'Communication', 30),
('CR008', 'C002', 'Teamwork', 30),
('CR009', 'C002', 'Delivery Quality', 25),
('CR010', 'C002', 'Leadership', 25);

--
-- Table structure for table `performance_cycle`
--

CREATE TABLE `performance_cycle` (
  `cycle_id` varchar(255) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `performance_cycle`
--

INSERT INTO `performance_cycle` (`cycle_id`, `company_id`, `name`, `start_date`, `end_date`) VALUES
('PC001', 'C001', '2025 Annual Review', '2025-01-01', '2025-12-31'),
('PC002', 'C001', '2025 Mid-Year Review', '2025-06-01', '2025-06-30'),
('PC003', 'C001', '2024 Annual Review', '2024-01-01', '2024-12-31'),
('PC004', 'C001', '2024 Mid-Year Review', '2024-06-01', '2024-06-30'),
('PC005', 'C001', 'Q1 2025 Review', '2025-01-01', '2025-03-31'),
('PC006', 'C002', '2025 Annual Review', '2025-01-01', '2025-12-31'),
('PC007', 'C002', '2025 Mid-Year Review', '2025-06-01', '2025-06-30'),
('PC008', 'C002', '2024 Annual Review', '2024-01-01', '2024-12-31'),
('PC009', 'C002', 'Q1 2025 Review', '2025-01-01', '2025-03-31'),
('PC010', 'C001', 'Q2 2025 Review', '2025-04-01', '2025-06-30');

--
-- Table structure for table `performance_rating_scale`
--

CREATE TABLE `performance_rating_scale` (
  `rating_id` varchar(50) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `rating_name` varchar(100) NOT NULL,
  `min_score` int(11) NOT NULL,
  `max_score` int(11) NOT NULL,
  `color_hex` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `performance_rating_scale`
--

INSERT INTO `performance_rating_scale` (`rating_id`, `company_id`, `rating_name`, `min_score`, `max_score`, `color_hex`) VALUES
('RT001', 'C001', 'Excellent', 90, 100, '#3C9A5F'),
('RT002', 'C001', 'Very Good', 80, 89, '#E0A84B'),
('RT003', 'C001', 'Satisfactory', 70, 79, '#4A7BD8'),
('RT004', 'C001', 'Needs Improvement', 60, 69, '#7C5CF5'),
('RT005', 'C001', 'Unsatisfactory', 0, 59, '#EF4444'),
('RT006', 'C002', 'Excellent', 90, 100, '#3C9A5F'),
('RT007', 'C002', 'Very Good', 80, 89, '#E0A84B'),
('RT008', 'C002', 'Satisfactory', 70, 79, '#4A7BD8'),
('RT009', 'C002', 'Needs Improvement', 60, 69, '#7C5CF5'),
('RT010', 'C002', 'Unsatisfactory', 0, 59, '#EF4444');

--
-- Table structure for table `performance_reviews`
--

CREATE TABLE `performance_reviews` (
  `review_id` varchar(255) NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `cycle_id` varchar(255) NOT NULL,
  `reviewer_id` int(11) NOT NULL,
  `overall_score` int(11) NOT NULL,
  `comments` varchar(1000) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `performance_reviews`
--

INSERT INTO `performance_reviews` (`review_id`, `employee_id`, `cycle_id`, `reviewer_id`, `overall_score`, `comments`, `created_at`) VALUES
('PR001', 'E001', 'PC001', 2, 92, 'Great overall', '2025-01-20 10:00:00'),
('PR002', 'E002', 'PC001', 2, 81, 'Good performance', '2025-01-20 10:10:00'),
('PR003', 'E003', 'PC001', 1, 77, 'Solid work', '2025-01-20 10:20:00'),
('PR004', 'E004', 'PC001', 2, 69, 'Needs consistency', '2025-01-20 10:30:00'),
('PR005', 'E005', 'PC001', 2, 58, 'Requires improvement', '2025-01-20 10:40:00'),
('PR006', 'E006', 'PC001', 2, 88, 'Strong delivery', '2025-01-20 10:50:00'),
('PR007', 'E007', 'PC006', 9, 91, 'Excellent', '2025-01-21 11:00:00'),
('PR008', 'E008', 'PC006', 9, 74, 'Average', '2025-01-21 11:10:00'),
('PR009', 'E009', 'PC006', 9, 62, 'Below target', '2025-01-21 11:20:00'),
('PR010', 'E010', 'PC001', 1, 85, 'Very good', '2025-01-21 11:30:00');

--
-- Table structure for table `performance_scores`
--

CREATE TABLE `performance_scores` (
  `score_id` varchar(255) NOT NULL,
  `review_id` varchar(255) NOT NULL,
  `criteria_id` varchar(255) NOT NULL,
  `score` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `performance_scores`
--

INSERT INTO `performance_scores` (`score_id`, `review_id`, `criteria_id`, `score`) VALUES
('PS001', 'PR001', 'CR001', 38),
('PS002', 'PR001', 'CR002', 27),
('PS003', 'PR001', 'CR003', 27),
('PS004', 'PR002', 'CR001', 32),
('PS005', 'PR002', 'CR002', 25),
('PS006', 'PR003', 'CR003', 22),
('PS007', 'PR004', 'CR004', 18),
('PS008', 'PR005', 'CR005', 14),
('PS009', 'PR006', 'CR002', 28),
('PS010', 'PR010', 'CR001', 35);

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `permission_id` varchar(100) NOT NULL,
  `permission_name` varchar(50) NOT NULL,
  `permission_description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`permission_id`, `permission_name`, `permission_description`) VALUES
('P001', 'VIEW_REPORTS', 'View reports'),
('P002', 'EDIT_EMPLOYEE', 'Edit employee'),
('P003', 'VIEW_ATTENDANCE', 'View attendance'),
('P004', 'EDIT_ATTENDANCE', 'Edit attendance'),
('P005', 'VIEW_PERFORMANCE', 'View performance'),
('P006', 'EDIT_PERFORMANCE', 'Edit performance'),
('P007', 'VIEW_EIM', 'View employee info'),
('P008', 'EDIT_EIM', 'Edit employee info'),
('P009', 'VIEW_NOTIFICATIONS', 'View notifications'),
('P010', 'MANAGE_ROLES', 'Manage roles');

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `report_id` varchar(255) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `report_type` varchar(255) NOT NULL,
  `format` varchar(50) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`report_id`, `company_id`, `report_type`, `format`, `created_by`, `created_at`) VALUES
('REP001', 'C001', 'Performance Report', 'PDF', 1, '2026-03-12 20:08:46'),
('REP002', 'C001', 'Attendance Report', 'EXCEL', 2, '2026-03-12 20:08:46'),
('REP003', 'C001', 'EIM Export', 'CSV', 2, '2026-03-12 20:08:46'),
('REP004', 'C001', 'Training Report', 'PDF', 1, '2026-03-12 20:08:46'),
('REP005', 'C001', 'Leave Report', 'PDF', 1, '2026-03-12 20:08:46'),
('REP006', 'C002', 'Performance Report', 'PDF', 9, '2026-03-12 20:08:46'),
('REP007', 'C002', 'Attendance Report', 'EXCEL', 8, '2026-03-12 20:08:46'),
('REP008', 'C002', 'EIM Export', 'CSV', 8, '2026-03-12 20:08:46'),
('REP009', 'C002', 'Training Report', 'PDF', 9, '2026-03-12 20:08:46'),
('REP010', 'C002', 'Leave Report', 'PDF', 9, '2026-03-12 20:08:46');

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` varchar(100) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `roles_descriptions` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`, `roles_descriptions`) VALUES
('R001', 'ADMIN', 'System Admin'),
('R002', 'MANAGER', 'Manager'),
('R003', 'EMPLOYEE', 'Employee'),
('R004', 'HR', 'HR Officer'),
('R005', 'FINANCE', 'Finance'),
('R006', 'ENGINEER', 'Engineer'),
('R007', 'SALES', 'Sales'),
('R008', 'ANALYST', 'Analyst'),
('R009', 'SUPPORT', 'Support'),
('R010', 'GUEST', 'Guest');

--
-- Table structure for table `role_permission`
--

CREATE TABLE `role_permission` (
  `role_permission_id` varchar(100) NOT NULL,
  `role_id` varchar(100) NOT NULL,
  `permission_id` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role_permission`
--

INSERT INTO `role_permission` (`role_permission_id`, `role_id`, `permission_id`) VALUES
('RP001', 'R001', 'P001'),
('RP002', 'R001', 'P002'),
('RP003', 'R002', 'P001'),
('RP004', 'R002', 'P003'),
('RP005', 'R004', 'P007'),
('RP006', 'R004', 'P008'),
('RP007', 'R006', 'P005'),
('RP008', 'R006', 'P006'),
('RP009', 'R007', 'P001'),
('RP010', 'R001', 'P010');

--
-- Table structure for table `shedule_reports`
--

CREATE TABLE `shedule_reports` (
  `shedule_id` varchar(100) NOT NULL,
  `report_id` varchar(255) NOT NULL,
  `frequency` varchar(50) DEFAULT NULL,
  `next_run` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shedule_reports`
--

INSERT INTO `shedule_reports` (`shedule_id`, `report_id`, `frequency`, `next_run`) VALUES
('SCH001', 'REP001', 'MONTHLY', '2026-03-12 20:08:46'),
('SCH002', 'REP002', 'WEEKLY', '2026-03-12 20:08:46'),
('SCH003', 'REP003', 'MONTHLY', '2026-03-12 20:08:46'),
('SCH004', 'REP004', 'MONTHLY', '2026-03-12 20:08:46'),
('SCH005', 'REP005', 'MONTHLY', '2026-03-12 20:08:46'),
('SCH006', 'REP006', 'MONTHLY', '2026-03-12 20:08:46'),
('SCH007', 'REP007', 'WEEKLY', '2026-03-12 20:08:46'),
('SCH008', 'REP008', 'MONTHLY', '2026-03-12 20:08:46'),
('SCH009', 'REP009', 'MONTHLY', '2026-03-12 20:08:46'),
('SCH010', 'REP010', 'MONTHLY', '2026-03-12 20:08:46');

--
-- Table structure for table `system_logs`
--

CREATE TABLE `system_logs` (
  `log_id` varchar(255) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `system_action` varchar(255) DEFAULT NULL,
  `time_stamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_logs`
--

INSERT INTO `system_logs` (`log_id`, `user_id`, `system_action`, `time_stamp`, `ip_address`) VALUES
('LOG001', 1, 'Database initialized', '2026-03-12 14:38:46', '127.0.0.1'),
('LOG002', 2, 'User logged in', '2026-03-12 14:38:46', '127.0.0.1'),
('LOG003', 3, 'Viewed dashboard', '2026-03-12 14:38:46', '127.0.0.1'),
('LOG004', 4, 'Requested training', '2026-03-12 14:38:46', '127.0.0.1'),
('LOG005', 5, 'Updated profile', '2026-03-12 14:38:46', '127.0.0.1'),
('LOG006', 6, 'Downloaded report', '2026-03-12 14:38:46', '127.0.0.1'),
('LOG007', 7, 'Viewed performance', '2026-03-12 14:38:46', '127.0.0.1'),
('LOG008', 8, 'Viewed attendance', '2026-03-12 14:38:46', '127.0.0.1'),
('LOG009', 9, 'Updated roles', '2026-03-12 14:38:46', '127.0.0.1'),
('LOG010', 10, 'Logout', '2026-03-12 14:38:46', '127.0.0.1');

--
-- Table structure for table `training_categories`
--

CREATE TABLE `training_categories` (
  `category_id` varchar(50) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `category_name` varchar(255) NOT NULL,
  `color_hex` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `training_categories`
--

INSERT INTO `training_categories` (`category_id`, `company_id`, `category_name`, `color_hex`) VALUES
('TC001', 'C001', 'Technical', '#4A7BD8'),
('TC002', 'C001', 'Soft Skills', '#7C5CF5'),
('TC003', 'C001', 'Leadership', '#E0A84B'),
('TC004', 'C001', 'Compliance', '#3C9A5F'),
('TC005', 'C001', 'Time Management', '#06B6D4'),
('TC006', 'C002', 'Technical', '#4A7BD8'),
('TC007', 'C002', 'Soft Skills', '#7C5CF5'),
('TC008', 'C002', 'Leadership', '#E0A84B'),
('TC009', 'C002', 'Compliance', '#3C9A5F'),
('TC010', 'C002', 'Productivity', '#06B6D4');

--
-- Table structure for table `training_requests`
--

CREATE TABLE `training_requests` (
  `request_id` varchar(50) NOT NULL,
  `company_id` varchar(255) NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `category_id` varchar(50) NOT NULL,
  `requested_at` datetime DEFAULT current_timestamp(),
  `status` varchar(50) DEFAULT 'REQUESTED'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `training_requests`
--

INSERT INTO `training_requests` (`request_id`, `company_id`, `employee_id`, `category_id`, `requested_at`, `status`) VALUES
('TR001', 'C001', 'E001', 'TC001', '2025-01-10 09:00:00', 'REQUESTED'),
('TR002', 'C001', 'E002', 'TC002', '2025-01-11 09:00:00', 'REQUESTED'),
('TR003', 'C001', 'E003', 'TC003', '2025-01-12 09:00:00', 'APPROVED'),
('TR004', 'C001', 'E004', 'TC004', '2025-01-13 09:00:00', 'REQUESTED'),
('TR005', 'C001', 'E005', 'TC001', '2025-01-14 09:00:00', 'APPROVED'),
('TR006', 'C001', 'E006', 'TC002', '2025-01-15 09:00:00', 'REQUESTED'),
('TR007', 'C002', 'E007', 'TC006', '2025-01-16 09:00:00', 'REQUESTED'),
('TR008', 'C002', 'E008', 'TC007', '2025-01-17 09:00:00', 'REQUESTED'),
('TR009', 'C002', 'E009', 'TC008', '2025-01-18 09:00:00', 'APPROVED'),
('TR010', 'C001', 'E010', 'TC005', '2025-01-19 09:00:00', 'REQUESTED');

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `company_id` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `user_name`, `company_id`, `email`, `password`, `status`, `last_login`) VALUES
(1, 'Manager One', 'C001', 'manager1@c1.com', 'hash1', 'ACTIVE', '2026-03-17 09:50:16'),
(2, 'Manager Two', 'C001', 'manager2@c1.com', 'hash2', 'ACTIVE', '2026-03-13 16:38:11'),
(3, 'Employee One', 'C001', 'employee1@c1.com', 'hash3', 'ACTIVE', '2026-03-12 15:26:26'),
(4, 'Employee Two', 'C001', 'employee2@c1.com', 'hash4', 'ACTIVE', NULL),
(5, 'Employee Three', 'C001', 'employee3@c1.com', 'hash5', 'ACTIVE', NULL),
(6, 'Employee Four', 'C001', 'employee4@c1.com', 'hash6', 'ACTIVE', NULL),
(7, 'Employee Five', 'C001', 'employee5@c1.com', 'hash7', 'ACTIVE', NULL),
(8, 'Manager Three', 'C002', 'manager1@c2.com', 'hash8', 'ACTIVE', '2026-03-12 15:00:11'),
(9, 'Manager Four', 'C002', 'manager2@c2.com', 'hash9', 'ACTIVE', NULL),
(10, 'Employee Six', 'C002', 'employee1@c2.com', 'hash10', 'ACTIVE', NULL);

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `user_role_id` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role_id` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`user_role_id`, `user_id`, `role_id`) VALUES
('UR001', 1, 'R001'),
('UR002', 2, 'R002'),
('UR003', 3, 'R003'),
('UR004', 4, 'R006'),
('UR005', 5, 'R007'),
('UR006', 6, 'R006'),
('UR007', 7, 'R003'),
('UR008', 8, 'R002'),
('UR009', 9, 'R001'),
('UR010', 10, 'R003');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance_records`
--
ALTER TABLE `attendance_records`
  ADD PRIMARY KEY (`attendance_id`),
  ADD KEY `fk_attendance_employee` (`employee_id`),
  ADD KEY `fk_attendance_status` (`status_id`);

--
-- Indexes for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `fk_session_attendance` (`attendance_id`);

--
-- Indexes for table `attendance_status_type`
--
ALTER TABLE `attendance_status_type`
  ADD PRIMARY KEY (`status_id`),
  ADD KEY `fk_attendance_company` (`company_id`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`company_id`);

--
-- Indexes for table `companies_settings`
--
ALTER TABLE `companies_settings`
  ADD PRIMARY KEY (`setting_id`),
  ADD KEY `cs_cid_fk` (`company_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`department_id`),
  ADD KEY `d_cid_fk` (`company_id`),
  ADD KEY `d_parent_fk` (`parent_department_id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`employee_id`),
  ADD KEY `fk_employee_company` (`company_id`),
  ADD KEY `fk_employee_department` (`department_id`),
  ADD KEY `fk_employee_job_role` (`job_role_id`),
  ADD KEY `fk_employee_user` (`user_id`),
  ADD KEY `fk_employee_location` (`location_id`);

--
-- Indexes for table `employment_contract`
--
ALTER TABLE `employment_contract`
  ADD PRIMARY KEY (`contract_id`),
  ADD KEY `fk_contract_employee` (`employee_id`);

--
-- Indexes for table `job_roles`
--
ALTER TABLE `job_roles`
  ADD PRIMARY KEY (`job_role_id`),
  ADD KEY `jr_cid_fk` (`company_id`);

--
-- Indexes for table `leave_entitlements`
--
ALTER TABLE `leave_entitlements`
  ADD PRIMARY KEY (`employee_id`,`leave_type`);

--
-- Indexes for table `leave_records`
--
ALTER TABLE `leave_records`
  ADD PRIMARY KEY (`leave_id`),
  ADD KEY `fk_leave_employee` (`employee_id`);

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`location_id`),
  ADD KEY `l_cid_fk` (`company_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `m_sender_fk` (`sender_user_id`),
  ADD KEY `m_receiver_fk` (`receiver_user_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `n_uid_fk` (`user_id`);

--
-- Indexes for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  ADD PRIMARY KEY (`notification_pref_id`),
  ADD KEY `np_uid_fk` (`user_id`),
  ADD KEY `np_nid_fk` (`notification_id`);

--
-- Indexes for table `performance_appraisals`
--
ALTER TABLE `performance_appraisals`
  ADD PRIMARY KEY (`appraisal_id`),
  ADD KEY `pa_company_fk` (`company_id`),
  ADD KEY `pa_employee_fk` (`employee_id`),
  ADD KEY `pa_cycle_fk` (`cycle_id`);

--
-- Indexes for table `performance_criteria`
--
ALTER TABLE `performance_criteria`
  ADD PRIMARY KEY (`criteria_id`),
  ADD KEY `pcr_company_fk` (`company_id`);

--
-- Indexes for table `performance_cycle`
--
ALTER TABLE `performance_cycle`
  ADD PRIMARY KEY (`cycle_id`),
  ADD KEY `pc_company_fk` (`company_id`);

--
-- Indexes for table `performance_rating_scale`
--
ALTER TABLE `performance_rating_scale`
  ADD PRIMARY KEY (`rating_id`),
  ADD KEY `prs_company_fk` (`company_id`);

--
-- Indexes for table `performance_reviews`
--
ALTER TABLE `performance_reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `pr_employee_fk` (`employee_id`),
  ADD KEY `pr_reviewer_fk` (`reviewer_id`),
  ADD KEY `pr_cycle_fk` (`cycle_id`);

--
-- Indexes for table `performance_scores`
--
ALTER TABLE `performance_scores`
  ADD PRIMARY KEY (`score_id`),
  ADD KEY `ps_review_fk` (`review_id`),
  ADD KEY `ps_criteria_fk` (`criteria_id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`permission_id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`report_id`),
  ADD KEY `r_cid_fk` (`company_id`),
  ADD KEY `r_createdby_fk` (`created_by`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `role_permission`
--
ALTER TABLE `role_permission`
  ADD PRIMARY KEY (`role_permission_id`),
  ADD KEY `rp_rid_fk` (`role_id`),
  ADD KEY `rp_pid_fk` (`permission_id`);

--
-- Indexes for table `shedule_reports`
--
ALTER TABLE `shedule_reports`
  ADD PRIMARY KEY (`shedule_id`),
  ADD KEY `sr_rid_fk` (`report_id`);

--
-- Indexes for table `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `fk_user_logs` (`user_id`);

--
-- Indexes for table `training_categories`
--
ALTER TABLE `training_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD KEY `tc_company_fk` (`company_id`);

--
-- Indexes for table `training_requests`
--
ALTER TABLE `training_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `tr_company_fk` (`company_id`),
  ADD KEY `tr_employee_fk` (`employee_id`),
  ADD KEY `tr_category_fk` (`category_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD KEY `u_cid_fk` (`company_id`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`user_role_id`),
  ADD KEY `ur_uid_fk` (`user_id`),
  ADD KEY `ur_rid_fk` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance_records`
--
ALTER TABLE `attendance_records`
  ADD CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_attendance_status` FOREIGN KEY (`status_id`) REFERENCES `attendance_status_type` (`status_id`);

--
-- Constraints for table `attendance_sessions`
--
ALTER TABLE `attendance_sessions`
  ADD CONSTRAINT `fk_session_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `attendance_records` (`attendance_id`);

--
-- Constraints for table `attendance_status_type`
--
ALTER TABLE `attendance_status_type`
  ADD CONSTRAINT `fk_attendance_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `companies_settings`
--
ALTER TABLE `companies_settings`
  ADD CONSTRAINT `cs_cid_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `d_cid_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `d_parent_fk` FOREIGN KEY (`parent_department_id`) REFERENCES `departments` (`department_id`);

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `fk_employee_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `fk_employee_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`),
  ADD CONSTRAINT `fk_employee_job_role` FOREIGN KEY (`job_role_id`) REFERENCES `job_roles` (`job_role_id`),
  ADD CONSTRAINT `fk_employee_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`),
  ADD CONSTRAINT `fk_employee_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `employment_contract`
--
ALTER TABLE `employment_contract`
  ADD CONSTRAINT `fk_contract_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `job_roles`
--
ALTER TABLE `job_roles`
  ADD CONSTRAINT `jr_cid_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `leave_entitlements`
--
ALTER TABLE `leave_entitlements`
  ADD CONSTRAINT `leave_entitlements_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `leave_records`
--
ALTER TABLE `leave_records`
  ADD CONSTRAINT `fk_leave_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `locations`
--
ALTER TABLE `locations`
  ADD CONSTRAINT `l_cid_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `m_receiver_fk` FOREIGN KEY (`receiver_user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `m_sender_fk` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `n_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  ADD CONSTRAINT `np_nid_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`notification_id`),
  ADD CONSTRAINT `np_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `performance_appraisals`
--
ALTER TABLE `performance_appraisals`
  ADD CONSTRAINT `pa_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `pa_cycle_fk` FOREIGN KEY (`cycle_id`) REFERENCES `performance_cycle` (`cycle_id`),
  ADD CONSTRAINT `pa_employee_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `performance_criteria`
--
ALTER TABLE `performance_criteria`
  ADD CONSTRAINT `pcr_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `performance_cycle`
--
ALTER TABLE `performance_cycle`
  ADD CONSTRAINT `pc_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `performance_rating_scale`
--
ALTER TABLE `performance_rating_scale`
  ADD CONSTRAINT `prs_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `performance_reviews`
--
ALTER TABLE `performance_reviews`
  ADD CONSTRAINT `pr_cycle_fk` FOREIGN KEY (`cycle_id`) REFERENCES `performance_cycle` (`cycle_id`),
  ADD CONSTRAINT `pr_employee_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `pr_reviewer_fk` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `performance_scores`
--
ALTER TABLE `performance_scores`
  ADD CONSTRAINT `ps_criteria_fk` FOREIGN KEY (`criteria_id`) REFERENCES `performance_criteria` (`criteria_id`),
  ADD CONSTRAINT `ps_review_fk` FOREIGN KEY (`review_id`) REFERENCES `performance_reviews` (`review_id`);

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `r_cid_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `r_createdby_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `role_permission`
--
ALTER TABLE `role_permission`
  ADD CONSTRAINT `rp_pid_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`),
  ADD CONSTRAINT `rp_rid_fk` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`);

--
-- Constraints for table `shedule_reports`
--
ALTER TABLE `shedule_reports`
  ADD CONSTRAINT `sr_rid_fk` FOREIGN KEY (`report_id`) REFERENCES `reports` (`report_id`);

--
-- Constraints for table `system_logs`
--
ALTER TABLE `system_logs`
  ADD CONSTRAINT `fk_user_logs` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `training_categories`
--
ALTER TABLE `training_categories`
  ADD CONSTRAINT `tc_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `training_requests`
--
ALTER TABLE `training_requests`
  ADD CONSTRAINT `tr_category_fk` FOREIGN KEY (`category_id`) REFERENCES `training_categories` (`category_id`),
  ADD CONSTRAINT `tr_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `tr_employee_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `u_cid_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `ur_rid_fk` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  ADD CONSTRAINT `ur_uid_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
COMMIT;
