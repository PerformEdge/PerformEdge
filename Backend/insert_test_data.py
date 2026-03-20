"""
Script to insert test attendance data for the current/recent dates.
Run this after database setup to populate the backend with recent data.
"""

import mysql.connector
from datetime import date, timedelta
import os

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "sdgp")
DB_NAME = os.getenv("DB_NAME", "perform_edge")

# Status IDs (from attendance_status_type table)
STATUS_MAP = {
    "Present": "AS001",
    "Absent": "AS002",
    "Late": "AS003",
    "HalfDay": "AS004",
    "WorkFromHome": "AS005",
}

# Employee IDs
EMPLOYEES = [f"E{str(i).zfill(3)}" for i in range(1, 11)]  # E001 to E010

def get_connection():
    """Create and return a database connection."""
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )

def insert_test_data(num_days=7):
    """Insert test attendance data for the last N days."""
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # Get the highest attendance_id to continue from
        cur.execute("SELECT MAX(SUBSTRING(attendance_id, 3)) FROM attendance_records")
        result = cur.fetchone()
        max_id = int(result[0]) if result[0] else 0
        next_id = max_id + 1
        
        # Status rotation pattern
        status_pattern = ["Present", "Present", "Late", "WorkFromHome", "Absent", "Present", "Present"]
        
        records_inserted = 0
        today = date.today()
        
        for day_offset in range(num_days):
            record_date = today - timedelta(days=num_days - 1 - day_offset)
            
            for employee_idx, emp_id in enumerate(EMPLOYEES):
                # Create varied attendance patterns
                status_key = status_pattern[(day_offset + employee_idx) % len(status_pattern)]
                status_id = STATUS_MAP.get(status_key, "AS001")
                
                attendance_id = f"AR{next_id:03d}"
                
                cur.execute("""
                    INSERT INTO attendance_records 
                    (attendance_id, employee_id, date_of_attendance, status_id)
                    VALUES (%s, %s, %s, %s)
                """, (attendance_id, emp_id, record_date, status_id))
                
                next_id += 1
                records_inserted += 1
        
        conn.commit()
        print(f"✅ Successfully inserted {records_inserted} attendance records for the last {num_days} days")
        print(f"   Date range: {today - timedelta(days=num_days-1)} to {today}")
        
    except Exception as e:
        print(f"❌ Error inserting data: {str(e)}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

def check_existing_data():
    """Check what date ranges already have data."""
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    
    try:
        cur.execute("""
            SELECT 
                MIN(date_of_attendance) as earliest,
                MAX(date_of_attendance) as latest,
                COUNT(*) as total_records
            FROM attendance_records
        """)
        result = cur.fetchone()
        
        if result and result['earliest']:
            print("\n📊 Current Database Data:")
            print(f"   Earliest date: {result['earliest']}")
            print(f"   Latest date: {result['latest']}")
            print(f"   Total records: {result['total_records']}")
        else:
            print("\n📊 Database is empty")
            
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("🔧 Attendance Test Data Insertion Script")
    print("=" * 50)
    
    check_existing_data()
    
    response = input("\n❓ Insert test data for last 7 days? (y/n): ").strip().lower()
    if response == 'y':
        insert_test_data(num_days=7)
        print("\n✅ Test data ready! Try accessing the API:")
        print("   http://localhost:8001/attendance/summary")
    else:
        print("Skipped data insertion.")
