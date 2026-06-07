from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.middlewares.audit import AuditLoggingMiddleware
from app.middlewares.error_handler import ErrorHandlingMiddleware
from app.routers import audit_logs, auth, cart_checkout, cashier, dashboard, error_logs, imports, master_data, medicines, monitoring, notifications, orders, prescriptions, reports, stocks

settings = get_settings()

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.backend_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(AuditLoggingMiddleware)

upload_dir = Path(settings.upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

report_dir = Path(settings.report_dir)
report_dir.mkdir(parents=True, exist_ok=True)
app.mount("/generated-reports", StaticFiles(directory=report_dir), name="generated-reports")

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(medicines.router)
app.include_router(master_data.router)
app.include_router(cart_checkout.router)
app.include_router(orders.router)
app.include_router(prescriptions.router)
app.include_router(stocks.router)
app.include_router(cashier.router)
app.include_router(notifications.router)
app.include_router(error_logs.router)
app.include_router(reports.router)
app.include_router(imports.router)
app.include_router(audit_logs.router)
app.include_router(monitoring.router)


@app.get("/")
def health_check():
    return {"message": "Klinik Makmur Jaya API", "status": "ok"}
