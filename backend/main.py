"""FastAPI backend.  Run:  uvicorn main:app --reload --port 8000"""
import logging
import re

from fastapi import Depends, FastAPI, HTTPException, Path, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

import config
from analytics import DataStore
from models import FilterParams, HealthResponse, PageParams, Paginated

logger = logging.getLogger("dashboard")

app = FastAPI(
    title="Student & Internship Analytics API — Batch 2024",
    description="Local analytics API over the 2024 internship dataset. No data leaves this machine.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

store = DataStore()
STUDENT_ID = Path(..., pattern=r"^STU\d{4}$", description="Student ID, e.g. STU0001")


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


def filters(f: FilterParams = Depends()) -> FilterParams:
    if f.stipend_min is not None and f.stipend_max is not None and f.stipend_min > f.stipend_max:
        raise HTTPException(422, "stipend_min cannot be greater than stipend_max")
    if f.date_from and f.date_to and f.date_from > f.date_to:
        raise HTTPException(422, "date_from cannot be after date_to")
    return f


def page(p: PageParams = Depends()) -> PageParams:
    return p


def csv_response(content: str, name: str) -> Response:
    safe = re.sub(r"[^A-Za-z0-9_.-]", "_", name)
    return Response(content, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{safe}"'})


@app.get("/api/health", response_model=HealthResponse)
def health():
    return store.health()


@app.get("/api/summary")
def summary(f: FilterParams = Depends(filters)):
    return store.summary(f)


@app.get("/api/filters")
def filter_options():
    return store.filter_options()


@app.get("/api/students", response_model=Paginated)
def students(f: FilterParams = Depends(filters), p: PageParams = Depends(page)):
    return store.students_page(f, p)


@app.get("/api/students/{student_id}")
def student(student_id: str = STUDENT_ID):
    detail = store.student_detail(student_id)
    if detail is None:
        raise HTTPException(404, f"Student {student_id} not found")
    return detail


@app.get("/api/student/{student_id}/internships")
def student_internships(student_id: str = STUDENT_ID):
    if not (store.students["Student_ID"] == student_id).any():
        raise HTTPException(404, f"Student {student_id} not found")
    return store.student_internships(student_id)


@app.get("/api/internships")
def internships(f: FilterParams = Depends(filters), p: PageParams = Depends(page)):
    return store.internships_view(f, p)


@app.get("/api/companies")
def companies(f: FilterParams = Depends(filters), p: PageParams = Depends(page)):
    return store.companies_view(f, p)


@app.get("/api/roles", response_model=Paginated)
def roles(f: FilterParams = Depends(filters), p: PageParams = Depends(page)):
    return store.roles_view(f, p)


@app.get("/api/demographics")
def demographics(f: FilterParams = Depends(filters)):
    return store.demographics(f)


@app.get("/api/stipend")
def stipend(f: FilterParams = Depends(filters)):
    return store.stipend(f)


@app.get("/api/operations")
def operations(f: FilterParams = Depends(filters)):
    return store.operations(f)


@app.get("/api/data-quality")
def data_quality():
    return store.data_quality()


@app.get("/api/export/students")
def export_students(f: FilterParams = Depends(filters)):
    return csv_response(store.export_students(f), "students_2024.csv")


@app.get("/api/export/internships")
def export_internships(f: FilterParams = Depends(filters)):
    return csv_response(store.export_internships(f), "internships_2024.csv")
