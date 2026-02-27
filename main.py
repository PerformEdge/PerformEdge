from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from login import router as login_router
from dashboard import router as dashboard_router
from performance import router as performance_router
from signup import router as signup_router
from forgot_password import router as forgot_password_router

from employee_dashboard import router as employee_dashboard_router
from employee_leave import router as employee_leave_router
from employee_performance import router as employee_performance_router
from employee_people import router as employee_people_router
from meta import router as meta_router
from search import router as search_router
from notifications import router as notifications_router
from messages import router as messages_router
from users import router as users_router
from EIM import router as eim_router
from service_year_analysis import router as service_year_analysis_router
from staff_analysis import router as staff_analysis_router
from contract_type_distribution import router as contract_type_distribution_router
from location_wise_staff_distribution import router as location_wise_staff_distribution_router
from age_analysis import router as age_analysis_router
from upcoming_birthdays import router as upcoming_birthdays_router
from category_distribution import router as category_distribution_router
from gender_analysis import router as gender_analysis_router
from attendance import router as attendance_router
from attendance_trends import router as attendance_trends_router
from attendance_location import router as attendance_location_router
from latecomers import router as latecomers_router
from nopay import router as nopay_router

app = FastAPI(title="PerformEdge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(login_router)
app.include_router(dashboard_router)
app.include_router(performance_router)
app.include_router(signup_router)
app.include_router(forgot_password_router)
app.include_router(employee_dashboard_router)
app.include_router(employee_leave_router)
app.include_router(employee_performance_router)
app.include_router(employee_people_router)
app.include_router(meta_router)
app.include_router(search_router)
app.include_router(notifications_router)
app.include_router(messages_router)
app.include_router(users_router)
app.include_router(eim_router)
app.include_router(service_year_analysis_router)
app.include_router(staff_analysis_router)
app.include_router(contract_type_distribution_router)
app.include_router(location_wise_staff_distribution_router)
app.include_router(age_analysis_router)
app.include_router(upcoming_birthdays_router)
app.include_router(category_distribution_router)
app.include_router(gender_analysis_router)
app.include_router(attendance_router)
app.include_router(attendance_trends_router)
app.include_router(attendance_location_router)
app.include_router(latecomers_router)
app.include_router(nopay_router)


@app.get("/")
def root():
    return {"message": "PerformEdge backend is running"}
