from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


class FilterParams(BaseModel):
    """Global dashboard filters. Student-level filters narrow students; internship-level filters narrow
    records (and students to those with a matching record)."""

    student: Optional[str] = Field(None, description="Student_ID")
    gender: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    batch: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    joining_location: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    stipend_min: Optional[float] = Field(None, ge=0)
    stipend_max: Optional[float] = Field(None, ge=0)

    def internship_level_active(self) -> bool:
        return any(v not in (None, "") for v in (
            self.company, self.role, self.status, self.joining_location,
            self.date_from, self.date_to, self.stipend_min, self.stipend_max,
        ))


class PageParams(BaseModel):
    search: Optional[str] = Field(None, max_length=100)
    sort_by: Optional[str] = None
    sort_dir: Literal["asc", "desc"] = "asc"
    page: int = Field(1, ge=1)
    page_size: int = Field(25, ge=1, le=500)


class HealthResponse(BaseModel):
    status: str
    students: int
    internship_records: int
    data_generated_at: Optional[str]


class Paginated(BaseModel):
    items: list[dict]
    total: int
    page: int
    page_size: int
    pages: int
