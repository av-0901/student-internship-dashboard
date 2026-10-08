"""In-memory analytics over the processed outputs. All aggregation happens here, not in the browser."""
from __future__ import annotations

import io
import json
import math

import numpy as np
import pandas as pd

import config
from data_processing import run_pipeline
from models import FilterParams, PageParams

UNKNOWN = "Not recorded"


def to_records(df: pd.DataFrame) -> list[dict]:
    return json.loads(df.to_json(orient="records", date_format="iso"))


def counts(series: pd.Series, top: int | None = None, fill: str | None = UNKNOWN) -> list[dict]:
    s = series.fillna(fill) if fill else series.dropna()
    vc = s.value_counts()
    if top:
        vc = vc.head(top)
    return [{"name": str(k), "value": int(v)} for k, v in vc.items()]


def num(value, digits: int = 0):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return round(float(value), digits) if digits else int(round(float(value)))


class DataStore:
    def __init__(self) -> None:
        self.load()

    # ------------------------------------------------------------------ loading
    def load(self) -> None:
        out = config.OUTPUT_DIR
        if not (out / "internship_professional.csv").exists() or not (out / "student_master.csv").exists():
            run_pipeline(verbose=False)
        str_cols = {"Contact": str, "Alternate_Contacts": str, "Batch": str, "Stipend_Raw": str}
        self.students = pd.read_csv(out / "student_master.csv", dtype=str_cols)
        self.internships = pd.read_csv(out / "internship_professional.csv", dtype=str_cols)
        self.internships["_date"] = pd.to_datetime(self.internships["Joining_Date"], errors="coerce")
        self.summary_tbl = pd.read_csv(out / "student_summary.csv")
        self.quality = pd.read_csv(out / "data_quality_report.csv")
        self.duplicates = pd.read_csv(out / "duplicate_records.csv")
        self.ambiguous = pd.read_csv(out / "ambiguous_records.csv", dtype={"Contact": str})
        self.dq_summary = json.loads((out / "data_quality_summary.json").read_text(encoding="utf-8"))
        # student attributes needed for internship-level analytics
        self.internships = self.internships.merge(
            self.students[["Student_ID", "Gender", "City", "State"]], on="Student_ID", how="left"
        )

    # ------------------------------------------------------------------ filtering
    def filter(self, f: FilterParams) -> tuple[pd.DataFrame, pd.DataFrame]:
        s = self.students
        if f.student:
            s = s[s["Student_ID"] == f.student]
        if f.gender:
            s = s[s["Gender"] == f.gender]
        if f.state:
            s = s[s["State"] == f.state]
        if f.city:
            s = s[s["City"] == f.city]
        if f.batch:
            s = s[s["Batch"] == f.batch]

        i = self.internships[self.internships["Student_ID"].isin(s["Student_ID"])]
        if f.company:
            i = i[i["Company"] == f.company]
        if f.role:
            i = i[i["Role"] == f.role]
        if f.status:
            i = i[i["Status"].fillna(UNKNOWN) == f.status]
        if f.joining_location:
            i = i[i["Joining_Location"].fillna(UNKNOWN) == f.joining_location]
        if f.date_from:
            i = i[i["_date"] >= pd.Timestamp(f.date_from)]
        if f.date_to:
            i = i[i["_date"] <= pd.Timestamp(f.date_to)]
        # stipend range only matches records with a known INR stipend
        if f.stipend_min is not None:
            i = i[i["Stipend"] >= f.stipend_min]
        if f.stipend_max is not None:
            i = i[i["Stipend"] <= f.stipend_max]
        if f.internship_level_active():
            s = s[s["Student_ID"].isin(i["Student_ID"])]
        return s, i

    @staticmethod
    def paginate(df: pd.DataFrame, p: PageParams, search_cols: list[str], default_sort: str) -> dict:
        if p.search:
            term = p.search.strip().lower()
            hay = df[search_cols].astype(object).fillna("").astype(str).apply(lambda c: c.str.lower()).agg(" ".join, axis=1)
            df = df[hay.str.contains(term, regex=False)]
        sort_by = p.sort_by if p.sort_by in df.columns else default_sort
        df = df.sort_values(sort_by, ascending=p.sort_dir == "asc", na_position="last", kind="stable")
        total = len(df)
        start = (p.page - 1) * p.page_size
        page_df = df.iloc[start:start + p.page_size]
        return {
            "items": to_records(page_df.drop(columns=[c for c in page_df.columns if c.startswith("_")])),
            "total": total,
            "page": p.page,
            "page_size": p.page_size,
            "pages": max(1, math.ceil(total / p.page_size)),
        }

    # ------------------------------------------------------------------ shared aggregations
    @staticmethod
    def stipend_stats(i: pd.DataFrame) -> dict:
        known = i["Stipend"].dropna()
        return {
            "average": num(known.mean()),
            "median": num(known.median()),
            "minimum": num(known.min()),
            "maximum": num(known.max()),
            "total_committed": num(i["Total_Stipend"].sum()) if i["Total_Stipend"].notna().any() else None,
            "known_count": int(len(known)),
            "missing_count": int(i["Stipend_Amount"].isna().sum()),
            "non_inr_count": int((i["Stipend_Currency"] == "USD").sum()),
            "unpaid_count": int((known == 0).sum()),
        }

    @staticmethod
    def internship_students(i: pd.DataFrame) -> pd.Series:
        """Students with at least one record that was not a rejected offer."""
        taken = i[~i["Status"].isin(config.NON_INTERNSHIP_STATUSES)]
        return taken["Student_ID"].drop_duplicates()

    @staticmethod
    def joining_months(i: pd.DataFrame) -> list[dict]:
        m = i.dropna(subset=["_date"]).groupby(i["_date"].dt.to_period("M")).size().sort_index()
        return [{"name": p.strftime("%b %Y"), "month": str(p), "value": int(v)} for p, v in m.items()]

    # ------------------------------------------------------------------ endpoints
    def health(self) -> dict:
        return {
            "status": "ok",
            "students": int(len(self.students)),
            "internship_records": int(len(self.internships)),
            "data_generated_at": self.dq_summary.get("generated_at"),
        }

    def filter_options(self) -> dict:
        s, i = self.students, self.internships

        def opts(series):
            return sorted({str(v) for v in series.dropna()}, key=str.lower)

        return {
            "students": to_records(s[["Student_ID", "Name"]].sort_values("Name")),
            "genders": opts(s["Gender"]),
            "states": opts(s["State"]),
            "cities": opts(s["City"]),
            "batches": opts(s["Batch"]),
            "companies": opts(i["Company"]),
            "roles": opts(i["Role"]),
            "statuses": opts(i["Status"]) + ([UNKNOWN] if i["Status"].isna().any() else []),
            "joining_locations": opts(i["Joining_Location"]) + ([UNKNOWN] if i["Joining_Location"].isna().any() else []),
            "date_min": i["_date"].min().date().isoformat() if i["_date"].notna().any() else None,
            "date_max": i["_date"].max().date().isoformat() if i["_date"].notna().any() else None,
            "stipend_min": num(i["Stipend"].min()),
            "stipend_max": num(i["Stipend"].max()),
        }

    def summary(self, f: FilterParams) -> dict:
        s, i = self.filter(f)
        per_student = i.groupby("Student_ID").size()
        with_internship = self.internship_students(i)
        stats = self.stipend_stats(i)
        top_companies = counts(i["Company"], 10, fill=None)
        top_roles = counts(i["Role"], 10, fill=None)
        states = counts(s["State"], 12)
        months = self.joining_months(i)
        status = counts(i["Status"])

        insights = []
        if len(s):
            if top_companies:
                insights.append(f"{top_companies[0]['name']} is the top employer with {top_companies[0]['value']} internship record(s).")
            if top_roles:
                insights.append(f"Most common role: {top_roles[0]['name']} ({top_roles[0]['value']} records).")
            multi = int((per_student > 1).sum())
            insights.append(f"{multi} of {len(s)} students ({multi / len(s):.0%}) have more than one internship record.")
            known_states = [x for x in states if x["name"] != UNKNOWN]
            if known_states:
                insights.append(f"{known_states[0]['name']} is the most common home state ({known_states[0]['value']} students).")
            if months:
                peak = max(months, key=lambda x: x["value"])
                insights.append(f"Peak joining month: {peak['name']} with {peak['value']} joinings.")
            if stats["median"] is not None:
                insights.append(f"Median monthly stipend is ₹{stats['median']:,} across {stats['known_count']} records with a known INR stipend.")
            rejected = int(i["Status"].isin(config.NON_INTERNSHIP_STATUSES).sum())
            if rejected:
                insights.append(f"{rejected} offer(s) were rejected; {int((i['Status'] == 'Early Relieving').sum())} record(s) ended in early relieving.")

        return {
            "kpis": {
                "total_students": int(len(s)),
                "total_internship_records": int(len(i)),
                "students_with_internship": int(len(with_internship)),
                "students_without_internship": int(len(s) - s["Student_ID"].isin(with_internship).sum()),
                "students_with_multiple_internships": int((per_student > 1).sum()),
                "companies": int(i["Company"].nunique()),
                "roles": int(i["Role"].nunique()),
                "average_stipend": stats["average"],
                "median_stipend": stats["median"],
                "known_stipend_records": stats["known_count"],
            },
            "charts": {
                "gender": counts(s["Gender"]),
                "status": status,
                "top_companies": top_companies,
                "top_roles": top_roles,
                "joining_months": months,
                "states": states,
            },
            "insights": insights,
        }

    def students_page(self, f: FilterParams, p: PageParams) -> dict:
        s, i = self.filter(f)
        cols = ["Student_ID", "Name", "Gender", "Email", "Contact", "City", "State", "Country",
                "Company_Count", "Internship_Count", "Accepted_Internship_Count"]
        latest = (i.sort_values("_date").groupby("Student_ID")[["Company", "Status"]].last()
                  .rename(columns={"Company": "Latest_Company", "Status": "Latest_Status"}))
        df = s[cols].merge(latest, left_on="Student_ID", right_index=True, how="left")
        return self.paginate(df, p, ["Student_ID", "Name", "Email", "Contact", "City", "State", "Latest_Company"], "Student_ID")

    def student_detail(self, student_id: str) -> dict | None:
        row = self.students[self.students["Student_ID"] == student_id]
        if row.empty:
            return None
        i = self.internships[self.internships["Student_ID"] == student_id].sort_values(["_date", "Source_Row"])
        latest = i.iloc[-1] if len(i) else None
        profile = to_records(row)[0]
        profile["Internship_Countries"] = sorted(i["Internship_Country"].dropna().unique().tolist())
        return {
            "profile": profile,
            "kpis": {
                "internship_count": int(len(i)),
                "company_count": int(i["Company"].nunique()),
                "average_stipend": num(i["Stipend"].mean()),
                "known_stipend_records": int(i["Stipend"].notna().sum()),
                "latest_internship": None if latest is None else f"{latest['Role']} @ {latest['Company']}",
                "latest_status": None if latest is None or pd.isna(latest["Status"]) else latest["Status"],
            },
            "internships": self.student_internships(student_id),
            "data_flags": to_records(self.ambiguous[self.ambiguous["Student_ID"] == student_id][["Source_Row", "Company", "Reason"]]),
        }

    def student_internships(self, student_id: str) -> list[dict]:
        i = self.internships[self.internships["Student_ID"] == student_id].sort_values(["_date", "Source_Row"])
        return to_records(i.drop(columns=["_date", "Gender", "City", "State"]))

    def internships_view(self, f: FilterParams, p: PageParams) -> dict:
        s, i = self.filter(f)
        per_student = i.groupby("Student_ID").size()
        tenure = i["Tenure_Months"].dropna()
        tenure_buckets = pd.cut(tenure, bins=[0, 2, 3, 5, 6, 12, np.inf], labels=["≤2", "3", "4–5", "6", "7–12", "12+"],
                                right=True).value_counts(sort=False)
        cols = ["Internship_ID", "Student_ID", "Name", "Company", "Role", "Joining_Location", "Joining_Date",
                "Status", "Stipend", "Stipend_Raw", "Stipend_Currency", "Tenure_Months", "Total_Stipend", "Internship_Country",
                "Is_Extended", "Offer_Letter_Available", "Process_Status", "_date"]
        return {
            "kpis": {
                "total_records": int(len(i)),
                "unique_companies": int(i["Company"].nunique()),
                "unique_roles": int(i["Role"].nunique()),
                "avg_internships_per_student": num(per_student.mean(), 2) if len(per_student) else 0,
                "students_with_multiple": int((per_student > 1).sum()),
                "students": int(len(s)),
            },
            "charts": {
                "top_companies": counts(i["Company"], 10, fill=None),
                "top_roles": counts(i["Role"], 10, fill=None),
                "status": counts(i["Status"]),
                "joining_months": self.joining_months(i),
                "joining_locations": counts(i["Joining_Location"]),
                "work_mode": counts(i["Work_Mode"]),
                "tenure": [{"name": f"{k} mo", "value": int(v)} for k, v in tenure_buckets.items()],
                "internship_country": counts(i["Internship_Country"]),
            },
            "records": self.paginate(i[cols], p, ["Name", "Student_ID", "Company", "Role", "Status", "Joining_Location"], "_date"),
        }

    def companies_view(self, f: FilterParams, p: PageParams) -> dict:
        _, i = self.filter(f)
        g = i.dropna(subset=["Company"]).groupby("Company")
        top_roles = g["Role"].agg(lambda r: "; ".join(f"{k} ({v})" for k, v in r.value_counts().head(3).items()))
        table = pd.DataFrame({
            "Company": g.size().index,
            "Student_Count": g["Student_ID"].nunique().values,
            "Internship_Record_Count": g.size().values,
            "Average_Stipend": g["Stipend"].mean().round(0).values,
            "Known_Stipend_Records": g["Stipend"].count().values,
            "Countries": g["Internship_Country"].agg(lambda c: ", ".join(sorted(c.dropna().unique()))).values,
            "Top_Roles": top_roles.values,
        })
        by_students = table.sort_values(["Student_Count", "Company"], ascending=[False, True]).head(12)
        by_records = table.sort_values(["Internship_Record_Count", "Company"], ascending=[False, True]).head(12)
        top10 = by_records["Company"].head(10)
        rel = (i[i["Company"].isin(top10)].groupby(["Company", "Role"]).size().reset_index(name="value")
               .sort_values(["Company", "value"], ascending=[True, False]))
        role_tbl = self.roles_table(i)
        return {
            "kpis": {
                "companies": int(len(table)),
                "roles": int(len(role_tbl)),
                "repeat_employers": int((table["Internship_Record_Count"] > 1).sum()),
                "single_hire_companies": int((table["Internship_Record_Count"] == 1).sum()),
            },
            "charts": {
                "by_students": [{"name": r.Company, "value": int(r.Student_Count)} for r in by_students.itertuples()],
                "by_records": [{"name": r.Company, "value": int(r.Internship_Record_Count)} for r in by_records.itertuples()],
                "top_roles": counts(i["Role"], 12, fill=None),
                "company_role": to_records(rel.rename(columns={"Company": "company", "Role": "role"})),
            },
            "table": self.paginate(table, p, ["Company", "Top_Roles", "Countries"], "Company"),
        }

    @staticmethod
    def roles_table(i: pd.DataFrame) -> pd.DataFrame:
        g = i.dropna(subset=["Role"]).groupby("Role")
        return pd.DataFrame({
            "Role": g.size().index,
            "Student_Count": g["Student_ID"].nunique().values,
            "Internship_Record_Count": g.size().values,
            "Average_Stipend": g["Stipend"].mean().round(0).values,
            "Companies": g["Company"].agg(lambda c: ", ".join(sorted(c.dropna().unique()))).values,
        })

    def roles_view(self, f: FilterParams, p: PageParams) -> dict:
        _, i = self.filter(f)
        return self.paginate(self.roles_table(i), p, ["Role", "Companies"], "Role")

    def demographics(self, f: FilterParams) -> dict:
        s, i = self.filter(f)
        return {
            "kpis": {
                "students": int(len(s)),
                "states": int(s["State"].nunique()),
                "cities": int(s["City"].nunique()),
                "location_recorded": int(s["State"].notna().sum()),
                "location_missing": int(s["State"].isna().sum()),
            },
            "charts": {
                "gender": counts(s["Gender"]),
                "states": counts(s["State"]),
                "cities": counts(s["City"], 15),
                "home_country": counts(s["Country"]),
                "internship_country": counts(i["Internship_Country"]),
                "gender_by_state": to_records(
                    s.dropna(subset=["State"]).pivot_table(index="State", columns="Gender", values="Student_ID",
                                                           aggfunc="count", fill_value=0)
                    .assign(_t=lambda d: d.sum(axis=1)).sort_values("_t", ascending=False).drop(columns="_t")
                    .head(10).reset_index()
                ),
            },
            "notes": [
                "Home City/State come from the student's records; students whose rows do not record them are shown as 'Not recorded'.",
                "Home country is derived from the State column (all recorded states are Indian states/UTs).",
                "The source 'Country' column describes where the internship is based, shown separately as Internship Country.",
            ],
        }

    def stipend(self, f: FilterParams) -> dict:
        _, i = self.filter(f)
        known = i.dropna(subset=["Stipend"])
        bins = [-0.1, 0, 10000, 15000, 20000, 25000, 30000, 40000, 50000, np.inf]
        labels = ["Unpaid (0)", "1–10k", "10–15k", "15–20k", "20–25k", "25–30k", "30–40k", "40–50k", "50k+"]
        dist = pd.cut(known["Stipend"], bins=bins, labels=labels).value_counts(sort=False)

        def by(col, top=12, min_records=1):
            g = known.dropna(subset=[col]).groupby(col)["Stipend"].agg(["mean", "count", "min", "max"])
            g = g[g["count"] >= min_records].sort_values("mean", ascending=False).head(top)
            return [{"name": str(k), "value": num(r["mean"]), "records": int(r["count"]),
                     "min": num(r["min"]), "max": num(r["max"])} for k, r in g.iterrows()]

        return {
            "stats": self.stipend_stats(i),
            "charts": {
                "distribution": [{"name": str(k), "value": int(v)} for k, v in dist.items()],
                "known_vs_missing": [
                    {"name": "Known INR stipend", "value": int(i["Stipend"].notna().sum())},
                    {"name": "Non-INR (excluded)", "value": int((i["Stipend_Currency"] == "USD").sum())},
                    {"name": "Missing", "value": int(i["Stipend_Amount"].isna().sum())},
                ],
                "by_company": by("Company"),
                "by_role": by("Role"),
                "by_location": by("Joining_Location"),
                "by_work_mode": by("Work_Mode"),
                "by_month": [
                    {"name": p.strftime("%b %Y"), "value": num(v)}
                    for p, v in known.dropna(subset=["_date"]).groupby(known["_date"].dt.to_period("M"))["Stipend"].mean().sort_index().items()
                ],
            },
            "non_inr_records": to_records(i[i["Stipend_Currency"] == "USD"][["Internship_ID", "Name", "Company", "Stipend_Raw", "Total_Stipend"]]),
            "notes": [
                "Stipend figures are monthly INR amounts. Missing stipends are excluded, never counted as zero.",
                "Explicit 0 stipends in the sheet are treated as known unpaid internships.",
                "Stipends recorded in another currency (USD) are excluded from INR statistics; no exchange rate is assumed.",
                "Total committed = sum of the sheet's Total Stipend column.",
            ],
        }

    def operations(self, f: FilterParams) -> dict:
        _, i = self.filter(f)

        def yes_no(col, yes="Yes", no="No"):
            return [{"name": yes, "value": int(i[col].sum())}, {"name": no, "value": int((~i[col].astype(bool)).sum())}]

        steps = [
            ("3 Screen Displays", "Screen_Display"),
            ("Digital Photo Given", "Digital_Photo_Given"),
            ("Founder's Letter", "Founder_Letter"),
            ("Parent Call", "Parent_Call"),
        ]
        ext = i[i["Is_Extended"]]
        today = pd.Timestamp.today().normalize()
        end = pd.to_datetime(i["Tenure_End_Date"], errors="coerce")
        upcoming = i[(end >= today) & (end <= today + pd.Timedelta(days=60))].assign(_end=end)
        return {
            "kpis": {
                "records": int(len(i)),
                "offer_accepted": int((i["Status"] == "Offer Accepted").sum()),
                "extended": int(i["Is_Extended"].sum()),
                "offer_letters": int(i["Offer_Letter_Available"].sum()),
                "parent_calls": int(i["Parent_Call"].sum()),
                "process_completed": int((i["Process_Status"] == "Completed").sum()),
            },
            "charts": {
                "status": counts(i["Status"]),
                "joining_timeline": self.joining_months(i),
                "extension": yes_no("Is_Extended", "Extended", "Not extended"),
                "extension_by_status": counts(ext["Status"]),
                "offer_letter": yes_no("Offer_Letter_Available", "Offer letter on file", "No offer letter"),
                "process_status": counts(i["Process_Status"]),
                "process_steps": [
                    {"name": label, "done": int(i[col].sum()), "pending": int((~i[col].astype(bool)).sum())}
                    for label, col in steps
                ],
                "work_mode": counts(i["Work_Mode"]),
                "joining_locations": counts(i["Joining_Location"]),
                "academic_year": counts(i["Academic_Year"]),
            },
            "extended_records": to_records(ext[["Internship_ID", "Student_ID", "Name", "Company", "Status", "Extension_Raw",
                                                "Extension_Letter_File", "Stipend_Increase"]]),
            "ending_soon": to_records(upcoming.sort_values("_end")[["Internship_ID", "Student_ID", "Name", "Company", "Role",
                                                                    "Tenure_End_Date", "Status"]]),
            "notes": [
                "Process steps are the onboarding columns that contain data in the sheet. Ledger Signing, "
                "Polaris Merch Unlock and Campus Credit Card are empty in the source and are not scored.",
                "The source sheet tracks a Founder's Letter (not a founder call) and a Parent Call column.",
            ],
        }

    def data_quality(self) -> dict:
        q = self.quality
        missing_by_col = q[(q["Table"] == "raw_source") & (q["Missing Count"] > 0)].sort_values("Missing Count", ascending=False)
        return {
            "summary": self.dq_summary,
            "quality_table": to_records(q),
            "missing_by_column": [{"name": r["Column"], "value": int(r["Missing Count"]), "pct": float(r["Missing Percentage"])}
                                  for _, r in missing_by_col.iterrows()],
            "duplicates": to_records(self.duplicates),
            "ambiguous": to_records(self.ambiguous),
        }

    # ------------------------------------------------------------------ exports
    @staticmethod
    def _safe_csv(df: pd.DataFrame) -> str:
        """Neutralise spreadsheet formula injection in exported cells."""
        def guard(v):
            return "'" + v if isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r") else v
        buf = io.StringIO()
        df.map(guard).to_csv(buf, index=False)
        return "\ufeff" + buf.getvalue()

    def export_students(self, f: FilterParams) -> str:
        s, _ = self.filter(f)
        return self._safe_csv(s)

    def export_internships(self, f: FilterParams) -> str:
        _, i = self.filter(f)
        return self._safe_csv(i.drop(columns=["_date"]))
