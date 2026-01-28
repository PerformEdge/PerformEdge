from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from login import router as login_router
from signup import router as signup_router
from forgot_password import router as forgot_router

app = FastAPI()

# MAIN
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(login_router)
app.include_router(signup_router)
app.include_router(forgot_router)

@app.get("/")
def root():
    return {"status": "Backend running"}