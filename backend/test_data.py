"""Data validation tests. Run:  python -m pytest test_data.py -v   (or python test_data.py for the report)"""
import json

import pandas as pd
import pytest

import config
from data_processing import load_raw, run_pipeline

OUT = config.OUTPUT_DIR
REQUIRED_FILES = [
    "phase1_profile.json", "phase1_profile.csv", "student_master.csv", "internship_professional.csv",
    "company_master.csv", "role_master.csv", "location_master.csv", "student_summary.csv",
    "duplicate_records.csv", "ambiguous_records.csv", "data_quality_report.csv", "data_quality_summary.json",
]


@pytest.fixture(scope="session", autouse=True)
def pipeline():
    return run_pipeline(verbose=False)


@pytest.fixture(scope="session")
def students():
    return pd.read_csv(OUT / "student_master.csv", dtype={"Contact": str})


@pytest.fixture(scope="session")
def internships():
    return pd.read_csv(OUT / "internship_professional.csv", dtype={"Stipend_Raw": str})


def test_output_files_exist():
    missing = [f for f in REQUIRED_FILES if not (OUT / f).exists()]
    assert not missing, f"Missing outputs: {missing}"


def test_student_master_one_row_per_student(students):
    assert students["Student_ID"].is_unique
    assert students["Student_ID"].str.fullmatch(r"STU\d{4}").all()
    assert students["Email"].is_unique


def test_student_ids_are_stable():
    before = pd.read_csv(OUT / "student_master.csv")[["Student_ID", "Email"]]
    run_pipeline(verbose=False)
    after = pd.read_csv(OUT / "student_master.csv")[["Student_ID", "Email"]]
    pd.testing.assert_frame_equal(before, after)


def test_every_internship_student_exists(students, internships):
    assert set(internships["Student_ID"]) <= set(students["Student_ID"])


def test_no_exact_duplicate_professional_records(internships):
    assert not internships.drop(columns=["Internship_ID", "Source_Row"]).duplicated().any()


def test_required_columns(students, internships):
    for col in ["Student_ID", "Name", "Gender", "Email", "Contact", "City", "State", "Country", "LinkedIn",
                "Batch", "Internship_Count", "Company_Count"]:
        assert col in students.columns, col
    for col in ["Student_ID", "Company", "Role", "Joining_Location", "Joining_Date", "Status", "Stipend",
                "Tenure_Months", "Total_Stipend", "Is_Extended", "Offer_Letter_Available", "Founder_Letter",
                "Parent_Call", "Process_Status"]:
        assert col in internships.columns, col


def test_missing_stipend_not_zero(internships):
    raw_missing = internships["Stipend_Raw"].isna()
    assert internships.loc[raw_missing, "Stipend"].isna().all()
    # non-INR stipend is not silently treated as INR or zero
    usd = internships["Stipend_Currency"] == "USD"
    assert internships.loc[usd, "Stipend"].isna().all()
    assert (internships.loc[usd, "Stipend_Amount"] > 0).all()
    # every zero stipend came from an explicit 0 in the source
    zeros = internships["Stipend"] == 0
    assert (internships.loc[zeros, "Stipend_Raw"].str.strip() == "0").all()


def test_multiple_internships_preserved(students, internships):
    raw = load_raw()
    assert len(internships) == len(raw) - len(pd.read_csv(OUT / "duplicate_records.csv"))
    counts = internships.groupby("Student_ID").size()
    assert (students.set_index("Student_ID")["Internship_Count"] == counts).all()
    assert (counts > 1).sum() > 0


def test_reconciliation_balances(students, internships):
    summary = json.loads((OUT / "data_quality_summary.json").read_text(encoding="utf-8"))
    r = summary["reconciliation"]
    assert r["raw_records"] - r["true_duplicates_removed"] == r["clean_records"] == len(internships)
    assert (r["students_with_1_internship"] + r["students_with_2_internships"]
            + r["students_with_3_internships"] + r["students_with_4plus_internships"]) == len(students)


def test_api_endpoints(students, internships):
    from fastapi.testclient import TestClient
    from main import app

    c = TestClient(app)
    for path in ["/api/health", "/api/summary", "/api/students", "/api/internships", "/api/companies", "/api/roles",
                 "/api/demographics", "/api/stipend", "/api/operations", "/api/data-quality", "/api/filters"]:
        assert c.get(path).status_code == 200, path
    summary = c.get("/api/summary").json()["kpis"]
    assert summary["total_students"] == len(students)
    assert summary["total_internship_records"] == len(internships)

    multi = students.sort_values("Internship_Count").iloc[-1]
    detail = c.get(f"/api/students/{multi.Student_ID}").json()
    assert len(detail["internships"]) == multi.Internship_Count > 1
    assert c.get("/api/students/STU9999").status_code == 404
    assert c.get("/api/students/../../etc").status_code in (404, 422)

    company = internships["Company"].value_counts().index[0]
    filtered = c.get("/api/summary", params={"company": company}).json()["kpis"]
    assert filtered["total_internship_records"] == (internships["Company"] == company).sum()
    assert c.get("/api/summary", params={"stipend_min": 5, "stipend_max": 1}).status_code == 422

    name = students.iloc[0]["Name"].split()[0]
    for path in ["/api/students", "/api/internships", "/api/companies", "/api/roles"]:
        assert c.get(path, params={"search": name, "sort_by": "Name", "sort_dir": "desc"}).status_code == 200, path
    found = c.get("/api/students", params={"search": name}).json()
    assert found["total"] >= 1

    exp = c.get("/api/export/students")
    assert exp.status_code == 200 and "text/csv" in exp.headers["content-type"]
    assert exp.text.count("\n") == len(students) + 1


def print_reconciliation():
    summary = run_pipeline(verbose=False)
    r = summary["reconciliation"]
    print("\nRECONCILIATION REPORT")
    print("-" * 44)
    for label, key in [
        ("Raw records", "raw_records"),
        ("True duplicates removed", "true_duplicates_removed"),
        ("Clean records", "clean_records"),
        ("Unique students", "unique_students"),
        ("Students with 1 internship", "students_with_1_internship"),
        ("Students with 2 internships", "students_with_2_internships"),
        ("Students with 3 internships", "students_with_3_internships"),
        ("Students with 4+ internships", "students_with_4plus_internships"),
    ]:
        print(f"{label:32s} {r[key]:>8}")
    print(f"{'Ambiguous records (kept)':32s} {summary['ambiguous_records']:>8}")


if __name__ == "__main__":
    print_reconciliation()
    raise SystemExit(pytest.main([__file__, "-q"]))
