from database import get_database_connection
from date_utils import resolve_date_range
from datetime import date

# Get dates that should be used
start_date, end_date = resolve_date_range()
print(f"Resolved dates: {start_date} to {end_date}")

# Connect and run query
conn = get_database_connection()
cur = conn.cursor(dictionary=True)

# Run the query
cur.execute("""
    SELECT
      SUM(CASE WHEN ast.status_name='Present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN ast.status_name='Late' THEN 1 ELSE 0 END) AS late,
      SUM(CASE WHEN ast.status_name='Absent' THEN 1 ELSE 0 END) AS on_leave
    FROM attendance_records ar
    JOIN attendance_status_type ast ON ast.status_id = ar.status_id
    JOIN employees e ON e.employee_id = ar.employee_id
    LEFT JOIN departments d ON d.department_id = e.department_id
    LEFT JOIN locations l ON l.location_id = e.location_id
    WHERE ar.date_of_attendance BETWEEN %s AND %s
""", (start_date, end_date))

row = cur.fetchone()
print(f"Query result: {row}")
cur.close()
conn.close()
