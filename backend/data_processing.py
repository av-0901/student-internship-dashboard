"""Reproducible cleaning pipeline: raw CSV -> profiled, cleaned, modelled outputs.

Run:  python data_processing.py
"""
from __future__ import annotations

import json
import re
from datetime import datetime

import numpy as np
import pandas as pd

import config

INVISIBLE_CHARS = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060\ufeff]")
MISSING_TOKENS = {"", "-", ".", "#REF!", "#N/A", "N/A", "nan", "NaN", "None"}

# Clean names for the raw columns we keep (source name stripped of surrounding whitespace).
RAW_TO_CLEAN = {
    "Month": "Month_Raw",
    "Name": "Name",
    "MSU Email Address": "Email",
    "Batch": "Batch",
    "Gender": "Gender",
    "Linkedin Profile": "LinkedIn",
    "Contact Number": "Contact_Raw",
    "Company": "Company_Raw",
    "Country": "Internship_Country",
    "Joining Location": "Joining_Location_Raw",
    "Role": "Role_Raw",
    "Joining": "Joining_Date_Raw",
    "Year": "Academic_Year",
    "Stipend": "Stipend_Raw",
    "Tenure - Months": "Tenure_Months_Raw",
    "Total Stipend": "Total_Stipend_Raw",
    "Deadline": "Tenure_End_Date_Raw",
    "Offer Letter": "Offer_Letter_File",
    "Stipend Increase": "Stipend_Increase",
    "Feedback": "Feedback",
    "Is getting extended / not": "Extension_Raw",
    "Status": "Status",
    "Unnamed: 22": "Extension_Letter_File",
    "City": "City",
    "State": "State",
    "Parent Call (Step 5 - Batch Manager).1": "Parent_Call_Recording",
}


# --------------------------------------------------------------------------- source
def ensure_raw_csv() -> None:
    """Create the raw CSV from the supplied workbook if it does not exist yet (never overwrites)."""
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    if config.RAW_CSV.exists():
        return
    if not config.SOURCE_XLSX.exists():
        raise FileNotFoundError(f"Dataset not found: {config.RAW_CSV}")
    import openpyxl

    df = pd.read_excel(config.SOURCE_XLSX, sheet_name=0, dtype=str)
    df.to_csv(config.RAW_CSV, index=False, encoding="utf-8-sig")

    wb = openpyxl.load_workbook(config.SOURCE_XLSX)
    ws = wb.worksheets[0]
    headers = [c.value for c in ws[1]]
    comments = [
        {
            "Source_Row": cell.row,
            "Column": (headers[cell.column - 1] or "").strip(),
            "Comment": cell.comment.text.strip(),
        }
        for row in ws.iter_rows(min_row=2)
        for cell in row
        if cell.comment
    ]
    pd.DataFrame(comments, columns=["Source_Row", "Column", "Comment"]).to_csv(
        config.CELL_COMMENTS_CSV, index=False, encoding="utf-8-sig"
    )


def load_raw() -> pd.DataFrame:
    ensure_raw_csv()
    df = pd.read_csv(config.RAW_CSV, dtype=str, keep_default_na=False, encoding="utf-8-sig")
    df.insert(0, "Source_Row", np.arange(2, len(df) + 2))  # spreadsheet row number
    return df


# --------------------------------------------------------------------------- helpers
def clean_text(value):
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    s = INVISIBLE_CHARS.sub("", str(value)).replace("\xa0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return np.nan if s in MISSING_TOKENS else s


def smart_title(value):
    """Title-case words that are entirely upper or lower case; keep mixed-case words (e.g. 'YM')."""
    if pd.isna(value):
        return value
    words = []
    for w in str(value).split(" "):
        if w.islower() or (w.isupper() and len(w) > 2):
            w = "-".join(p[:1].upper() + p[1:].lower() for p in w.split("-"))
            w = {"And": "and", "Of": "of"}.get(w, w)
        words.append(w)
    return " ".join(words)


def norm_key(value) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def clean_contact(value):
    if pd.isna(value):
        return np.nan
    digits = re.sub(r"\D", "", str(value))
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits if re.fullmatch(r"[6-9]\d{9}", digits) else np.nan


def parse_number(value):
    if pd.isna(value):
        return np.nan
    m = re.search(r"-?\d+(?:\.\d+)?", str(value).replace(",", ""))
    return float(m.group()) if m else np.nan


DATE_FORMATS = ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d %b %Y", "%d %B %Y", "%d/%m/%Y", "%B %d %Y"]


def parse_date(value):
    """Parse the mixed date styles in the sheet. Returns NaT for missing or impossible dates."""
    if pd.isna(value):
        return pd.NaT
    s = re.sub(r"(\d+)(st|nd|rd|th)\b", r"\1", str(value).strip(), flags=re.I)
    s = s.replace(",", "").replace("Sept ", "Sep ")
    for fmt in DATE_FORMATS:
        try:
            return pd.Timestamp(datetime.strptime(s, fmt))
        except ValueError:
            continue
    return pd.NaT


def looks_like_date(value) -> bool:
    return pd.notna(value) and bool(re.search(r"\d{4}", str(value)))


def split_joining_location(value):
    """'Banglore(Onsite)' -> ('Bengaluru', 'Onsite');  'Remote' -> (NaN, 'Remote')."""
    if pd.isna(value):
        return np.nan, np.nan
    m = re.match(r"^\s*([^()]*?)\s*(?:\(([^)]*)\))?\s*$", str(value))
    place, mode = (m.group(1), m.group(2)) if m else (str(value), None)
    mode = mode.strip().title() if mode else np.nan
    if place.strip().lower() in {"remote", "wfh", "work from home"}:
        return np.nan, "Remote"
    city = config.LOCATION_CITY_ALIASES.get(norm_key(place), smart_title(place.strip()) or np.nan)
    return city, mode


def join_location_label(city, mode):
    if pd.isna(city) and pd.isna(mode):
        return np.nan
    if pd.isna(city):
        return mode
    return f"{city} ({mode})" if pd.notna(mode) else city


def mode_or_first(series: pd.Series):
    s = series.dropna()
    if s.empty:
        return np.nan
    counts = s.value_counts()
    top = counts[counts == counts.max()].index
    # tie -> the value that appears first (earliest record)
    return next(v for v in s if v in set(top))


def join_unique(series: pd.Series, sep: str = "; "):
    vals = list(dict.fromkeys(series.dropna().astype(str)))
    return sep.join(vals) if vals else np.nan


# --------------------------------------------------------------------------- phase 1
def profile_raw(raw: pd.DataFrame) -> tuple[dict, pd.DataFrame]:
    data = raw.drop(columns=["Source_Row"]).map(clean_text)
    rows = []
    for col in data.columns:
        s = data[col]
        non_null = s.dropna()
        numeric = pd.to_numeric(non_null, errors="coerce")
        inferred = (
            "empty" if non_null.empty
            else "numeric" if numeric.notna().all()
            else "date-like" if non_null.map(lambda v: pd.notna(parse_date(v))).mean() > 0.8
            else "text"
        )
        rows.append({
            "Column": col.strip(),
            "Inferred_Type": inferred,
            "Missing_Count": int(s.isna().sum()),
            "Missing_Percentage": round(s.isna().mean() * 100, 2),
            "Unique_Values": int(non_null.nunique()),
            "Top_Values": "; ".join(f"{k} ({v})" for k, v in non_null.value_counts().head(5).items()),
        })
    profile_df = pd.DataFrame(rows)

    email = data[" MSU Email Address"].str.lower() if " MSU Email Address" in data else data["MSU Email Address"].str.lower()
    repeated = (
        pd.DataFrame({"email": email, "name": data["Name"], "company": data["Company"]})
        .groupby("email")
        .agg(records=("name", "size"), names=("name", join_unique), companies=("company", join_unique))
        .query("records > 1")
        .sort_values("records", ascending=False)
        .reset_index()
    )

    def uniq(col):
        return int(data[col].dropna().nunique()) if col in data else None

    profile = {
        "source_file": config.RAW_CSV.name,
        "rows": int(len(raw)),
        "columns": int(data.shape[1]),
        "column_names": [c for c in raw.columns if c != "Source_Row"],
        "fully_empty_columns": [r["Column"] for r in rows if r["Inferred_Type"] == "empty"],
        "exact_duplicate_rows": int(data.duplicated().sum()),
        "unique": {
            "student_names": uniq("Name"),
            "emails": int(email.dropna().nunique()),
            "contacts": int(data["Contact Number"].map(clean_contact).dropna().nunique()),
            "companies_raw": uniq("Company"),
            "roles_raw": uniq("Role"),
            "cities": uniq("City"),
            "states": uniq("State"),
            "countries": uniq("Country"),
            "joining_locations_raw": uniq("Joining Location"),
            "statuses": uniq("Status"),
        },
        "value_counts": {
            col: {str(k): int(v) for k, v in data[col].value_counts(dropna=False).head(25).items()}
            for col in ["Gender", "Batch", "Year", "Country", "Status", "Joining Location", "Month",
                        "Stipend", "Tenure - Months", "Is getting extended / not"]
            if col in data
        },
        "ref_errors_in_month": int((raw["Month"].str.strip() == "#REF!").sum()) if "Month" in raw else 0,
        "students_appearing_multiple_times": int(len(repeated)),
        "repeated_students": repeated.to_dict(orient="records"),
        "note": "Repeated students are separate internship records (different companies/dates), not duplicates.",
        "column_profile": rows,
    }
    return profile, profile_df


# --------------------------------------------------------------------------- phase 2
def clean_records(raw: pd.DataFrame) -> pd.DataFrame:
    df = raw.copy()
    df.columns = [c.strip() for c in df.columns]
    text_cols = [c for c in df.columns if c != "Source_Row"]
    df[text_cols] = df[text_cols].map(clean_text)

    empty_cols = [c for c in text_cols if df[c].isna().all()]
    keep = {k: v for k, v in RAW_TO_CLEAN.items() if k in df.columns}
    out = df[["Source_Row"] + list(keep) + list(config.PROCESS_STEP_COLUMNS.values())].rename(columns=keep)
    out.attrs["empty_columns"] = empty_cols

    # identity
    out["Name"] = out["Name"].map(smart_title)
    out["Email"] = out["Email"].str.lower()
    out["Email_Valid"] = out["Email"].str.fullmatch(r"[^@\s]+@[^@\s]+\.[a-z]{2,}", na=False)
    out["University_Email"] = out["Email"].str.endswith("@" + config.UNIVERSITY_EMAIL_DOMAIN, na=False)
    out["Contact"] = out["Contact_Raw"].map(clean_contact)
    out["Gender"] = out["Gender"].map(smart_title)
    out["LinkedIn"] = out["LinkedIn"].where(out["LinkedIn"].str.contains("linkedin.com", case=False, na=False))
    out["City"] = out["City"].map(smart_title)
    out["State"] = out["State"].map(smart_title)
    out["Batch"] = out["Batch"].str.replace(r"\.0$", "", regex=True)

    # company: explicit alias map only, otherwise the trimmed original
    out["Company"] = out["Company_Raw"].map(
        lambda v: config.COMPANY_ALIASES.get(norm_key(v), v) if pd.notna(v) else v
    )
    # role: trim stray punctuation; merge variants that differ only by case/spacing
    role = out["Role_Raw"].str.strip(" ,;.-")
    role_key = role.map(lambda v: re.sub(r"\s+", " ", v.lower()) if pd.notna(v) else v)
    canonical = role.groupby(role_key).agg(mode_or_first)
    out["Role"] = role_key.map(canonical)

    out["Internship_Country"] = out["Internship_Country"].map(smart_title)
    out.loc[out["Internship_Country"].str.upper().isin(["UAE", "USA", "UK"]), "Internship_Country"] = (
        out["Internship_Country"].str.upper()
    )

    loc = out["Joining_Location_Raw"].map(split_joining_location)
    out["Joining_City"] = loc.map(lambda t: t[0])
    out["Work_Mode"] = loc.map(lambda t: t[1])
    out["Joining_Location"] = [join_location_label(c, m) for c, m in zip(out["Joining_City"], out["Work_Mode"])]

    # dates
    out["Joining_Date"] = out["Joining_Date_Raw"].map(parse_date)
    out["Joining_Date_Invalid"] = out["Joining_Date_Raw"].notna() & out["Joining_Date"].isna()
    out["Joining_Month"] = out["Joining_Date"].dt.strftime("%Y-%m")
    out["Month_Ref_Error"] = raw["Month"].str.strip().eq("#REF!").to_numpy() if "Month" in raw else False
    out["Tenure_End_Date"] = out["Tenure_End_Date_Raw"].map(parse_date)
    out["Tenure_End_Date_Invalid"] = out["Tenure_End_Date_Raw"].notna() & out["Tenure_End_Date"].isna()
    out["Academic_Year"] = out["Academic_Year"].str.title()

    # stipend (monthly). Missing stays missing; non-INR amounts are kept but excluded from INR analytics.
    out["Stipend_Amount"] = out["Stipend_Raw"].map(parse_number)
    out["Stipend_Currency"] = np.where(
        out["Stipend_Raw"].str.contains("USD|\\$", case=False, na=False), "USD",
        np.where(out["Stipend_Amount"].notna(), "INR", None),
    )
    out["Stipend"] = out["Stipend_Amount"].where(out["Stipend_Currency"] == "INR")
    out["Stipend_Known"] = out["Stipend"].notna()
    out["Unpaid"] = out["Stipend"].eq(0)
    out["Tenure_Months"] = out["Tenure_Months_Raw"].map(parse_number)
    out["Total_Stipend"] = out["Total_Stipend_Raw"].map(parse_number)
    expected = out["Stipend"] * out["Tenure_Months"]
    out["Total_Stipend_Mismatch"] = out["Total_Stipend"].notna() & expected.notna() & (
        (expected - out["Total_Stipend"]).abs() > 1
    )

    # offer / extension
    out["Offer_Letter_Available"] = out["Offer_Letter_File"].notna()
    out["Is_Extended"] = out["Extension_Raw"].notna() | out["Extension_Letter_File"].notna()
    out["Extension_Until"] = out["Extension_Raw"].map(lambda v: parse_date(v) if looks_like_date(v) else pd.NaT)
    out["Extension_Date_Invalid"] = out["Extension_Raw"].map(looks_like_date) & out["Extension_Until"].isna()
    out["Stipend_Increase_Amount"] = out["Stipend_Increase"].map(parse_number)

    # onboarding process steps
    steps = config.PROCESS_STEP_COLUMNS
    out["Screen_Display_Link"] = out[steps["Screen_Display"]]
    out["Parent_Call_By"] = out[steps["Parent_Call"]]
    for name, col in steps.items():
        out[name] = out[col].notna()
    out = out.drop(columns=list(steps.values()))
    out["Process_Steps_Completed"] = out[list(steps)].sum(axis=1).astype(int)
    out["Process_Status"] = np.select(
        [out["Process_Steps_Completed"] == len(steps), out["Process_Steps_Completed"] > 0],
        ["Completed", "In Progress"], default="Not Started",
    )

    # cell comments from the workbook (if exported)
    if config.CELL_COMMENTS_CSV.exists():
        cm = pd.read_csv(config.CELL_COMMENTS_CSV, dtype={"Source_Row": int})
        notes = cm.assign(Note=cm["Column"] + ": " + cm["Comment"].str.replace("\n", " | "))
        notes = notes.groupby("Source_Row")["Note"].agg(" || ".join)
        out["Notes"] = out["Source_Row"].map(notes)
    else:
        out["Notes"] = np.nan
    out["Status"] = out["Status"].map(smart_title)
    return out


def split_duplicates(clean: pd.DataFrame, raw: pd.DataFrame):
    """Exact duplicates = every original column identical (after whitespace cleanup)."""
    original = raw.drop(columns=["Source_Row"]).map(clean_text)
    dup_mask = original.duplicated(keep="first").to_numpy()
    duplicates = clean[dup_mask].assign(Duplicate_Reason="All original columns identical to an earlier row")
    return clean[~dup_mask].copy(), duplicates


def identity_key(row) -> str:
    if row["University_Email"] or row["Email_Valid"]:
        return "email:" + row["Email"]
    if pd.notna(row["Contact"]):
        return "contact:" + row["Contact"]
    return "name:" + norm_key(row["Name"])


def assign_student_ids(df: pd.DataFrame) -> pd.DataFrame:
    """Stable IDs: existing keys keep their ID (persisted map); new keys get the next number."""
    df = df.copy()
    df["Identity_Key"] = df.apply(identity_key, axis=1)
    # attach contact-only / name-only rows to an email identity when unambiguous
    email_by_contact = (
        df[df["Identity_Key"].str.startswith("email:") & df["Contact"].notna()]
        .groupby("Contact")["Identity_Key"].agg(lambda s: s.iloc[0] if s.nunique() == 1 else None)
    )
    mask = df["Identity_Key"].str.startswith("contact:")
    df.loc[mask, "Identity_Key"] = df.loc[mask, "Contact"].map(email_by_contact).fillna(df.loc[mask, "Identity_Key"])

    map_path = config.OUTPUT_DIR / "student_id_map.csv"
    existing = pd.read_csv(map_path, dtype=str) if map_path.exists() else pd.DataFrame(columns=["Identity_Key", "Student_ID"])
    id_map = dict(zip(existing["Identity_Key"], existing["Student_ID"]))
    next_num = max([int(v[3:]) for v in id_map.values()] + [0]) + 1
    for key in df.sort_values("Source_Row")["Identity_Key"].drop_duplicates():
        if key not in id_map:
            id_map[key] = f"STU{next_num:04d}"
            next_num += 1
    pd.DataFrame(sorted(id_map.items(), key=lambda kv: kv[1]), columns=["Identity_Key", "Student_ID"]).to_csv(
        map_path, index=False
    )
    df["Student_ID"] = df["Identity_Key"].map(id_map)
    return df


def find_ambiguous(df: pd.DataFrame) -> pd.DataFrame:
    """Records kept in the data but flagged for human review."""
    cols = ["Source_Row", "Student_ID", "Name", "Email", "Contact", "Company", "Role", "Joining_Date", "Status"]
    flagged = []

    def add(mask, reason):
        if mask.any():
            flagged.append(df.loc[mask, cols].assign(Reason=reason))

    by_student = df.groupby("Student_ID")
    add(by_student["Name"].transform("nunique") > 1, "Same student (email) recorded with different name spellings")
    add(by_student["Contact"].transform("nunique") > 1, "Same student (email) recorded with different contact numbers")
    near_dup = df.duplicated(["Student_ID", "Company"], keep=False) | df.duplicated(
        ["Student_ID", "Joining_Date"], keep=False
    )
    add(near_dup, "Possible duplicate: same student with same company or same joining date but differing details")
    add(df["Status"].isna(), "Internship status missing")
    add(df["Stipend_Currency"].eq("USD"), "Stipend recorded in USD; excluded from INR stipend analytics")
    add(df["Total_Stipend_Mismatch"], "Total stipend does not equal monthly stipend x tenure")
    if not flagged:
        return pd.DataFrame(columns=cols + ["Reason"])
    out = pd.concat(flagged, ignore_index=True)
    return (
        out.groupby(cols, dropna=False, sort=False)["Reason"].agg(" | ".join).reset_index()
        .sort_values(["Student_ID", "Source_Row"])
    )


def build_student_master(df: pd.DataFrame) -> pd.DataFrame:
    g = df.sort_values("Source_Row").groupby("Student_ID", sort=True)
    master = g.agg(
        Name=("Name", mode_or_first),
        Name_Variants=("Name", join_unique),
        Gender=("Gender", mode_or_first),
        Email=("Email", "first"),
        Contact=("Contact", mode_or_first),
        Alternate_Contacts=("Contact", join_unique),
        City=("City", mode_or_first),
        State=("State", mode_or_first),
        LinkedIn=("LinkedIn", mode_or_first),
        Batch=("Batch", mode_or_first),
        Internship_Count=("Source_Row", "size"),
        Company_Count=("Company", "nunique"),
    ).reset_index()
    master["Country"] = np.where(master["State"].isin(config.INDIAN_STATES), "India", None)
    master.loc[master["Alternate_Contacts"] == master["Contact"], "Alternate_Contacts"] = np.nan
    master.loc[master["Name_Variants"] == master["Name"], "Name_Variants"] = np.nan
    master["Student_Picture"] = np.nan  # no per-student picture column exists in the source sheet
    accepted = df[~df["Status"].isin(config.NON_INTERNSHIP_STATUSES)].groupby("Student_ID").size()
    master["Accepted_Internship_Count"] = master["Student_ID"].map(accepted).fillna(0).astype(int)
    order = ["Student_ID", "Name", "Gender", "Email", "Contact", "Alternate_Contacts", "City", "State",
             "Country", "LinkedIn", "Student_Picture", "Batch", "Internship_Count",
             "Accepted_Internship_Count", "Company_Count", "Name_Variants"]
    return master[order]


INTERNSHIP_COLUMNS = [
    "Internship_ID", "Student_ID", "Source_Row", "Name", "Email", "Company", "Company_Raw", "Role", "Role_Raw",
    "Internship_Country", "Joining_Location", "Joining_City", "Work_Mode", "Joining_Location_Raw",
    "Joining_Date", "Joining_Month", "Academic_Year", "Status", "Stipend", "Stipend_Amount", "Stipend_Currency",
    "Stipend_Raw", "Stipend_Known", "Unpaid", "Tenure_Months", "Total_Stipend", "Total_Stipend_Mismatch",
    "Tenure_End_Date", "Tenure_End_Date_Raw", "Offer_Letter_Available", "Offer_Letter_File", "Stipend_Increase",
    "Stipend_Increase_Amount", "Is_Extended", "Extension_Raw", "Extension_Until", "Extension_Letter_File",
    "Screen_Display", "Screen_Display_Link", "Digital_Photo_Given", "Founder_Letter", "Parent_Call",
    "Parent_Call_By", "Parent_Call_Recording", "Process_Steps_Completed", "Process_Status", "Feedback",
    "Notes", "Month_Raw", "Month_Ref_Error", "Joining_Date_Invalid", "Tenure_End_Date_Invalid",
    "Extension_Date_Invalid", "Batch",
]


def build_internships(df: pd.DataFrame) -> pd.DataFrame:
    out = df.sort_values(["Student_ID", "Joining_Date", "Source_Row"]).reset_index(drop=True)
    out["Internship_ID"] = [f"INT{i:04d}" for i in range(1, len(out) + 1)]
    return out[INTERNSHIP_COLUMNS]


def build_entity_master(internships: pd.DataFrame, col: str, prefix: str, name_col: str) -> pd.DataFrame:
    sub = internships.dropna(subset=[col])
    g = sub.groupby(col)
    m = pd.DataFrame({
        "Internship_Record_Count": g.size(),
        "Student_Count": g["Student_ID"].nunique(),
        "Average_Stipend": g["Stipend"].mean().round(0),
        "Raw_Variants": g[f"{col}_Raw"].agg(join_unique),
    }).reset_index().rename(columns={col: name_col})
    m = m.sort_values(["Internship_Record_Count", name_col], ascending=[False, True]).reset_index(drop=True)
    m.insert(0, f"{prefix}_ID", [f"{prefix[:3].upper()}{i:03d}" for i in range(1, len(m) + 1)])
    return m


def build_location_master(students: pd.DataFrame, internships: pd.DataFrame) -> pd.DataFrame:
    s = students.dropna(subset=["State"]).copy()
    s["City"] = s["City"].fillna("Unknown")
    s["Country"] = s["Country"].fillna("Unknown")
    rec = internships.groupby("Student_ID").size()
    s["recs"] = s["Student_ID"].map(rec).fillna(0)
    m = s.groupby(["City", "State", "Country"]).agg(
        Student_Count=("Student_ID", "nunique"), Internship_Record_Count=("recs", "sum")
    ).reset_index().sort_values(["Student_Count", "State", "City"], ascending=[False, True, True])
    m["Internship_Record_Count"] = m["Internship_Record_Count"].astype(int)
    m.insert(0, "Location_ID", [f"LOC{i:03d}" for i in range(1, len(m) + 1)])
    return m.reset_index(drop=True)


def build_student_summary(students: pd.DataFrame, internships: pd.DataFrame) -> pd.DataFrame:
    ordered = internships.sort_values(["Student_ID", "Joining_Date", "Source_Row"])
    g = ordered.groupby("Student_ID")
    agg = pd.DataFrame({
        "Companies": g["Company"].agg(join_unique),
        "Roles": g["Role"].agg(join_unique),
        "Average_Stipend": g["Stipend"].mean().round(0),
        "Minimum_Stipend": g["Stipend"].min(),
        "Maximum_Stipend": g["Stipend"].max(),
        "Known_Stipend_Records": g["Stipend"].count(),
        "First_Joining_Date": g["Joining_Date"].min(),
        "Latest_Joining_Date": g["Joining_Date"].max(),
        "Latest_Company": g["Company"].last(),
        "Latest_Role": g["Role"].last(),
        "Latest_Status": g["Status"].last(),
    })
    base = students[["Student_ID", "Name", "Gender", "City", "State", "Company_Count", "Internship_Count",
                     "Accepted_Internship_Count"]]
    return base.merge(agg, left_on="Student_ID", right_index=True, how="left")


def data_quality_table(frame: pd.DataFrame, table: str) -> pd.DataFrame:
    rows = []
    for col in frame.columns:
        s = frame[col]
        rows.append({
            "Table": table,
            "Column": col.strip(),
            "Data Type": str(s.dtype),
            "Missing Count": int(s.isna().sum()),
            "Missing Percentage": round(float(s.isna().mean() * 100), 2),
            "Unique Values": int(s.nunique(dropna=True)),
        })
    return pd.DataFrame(rows)


def reconciliation(raw_count: int, dup_count: int, students: pd.DataFrame, internships: pd.DataFrame) -> dict:
    counts = students["Internship_Count"]
    return {
        "raw_records": raw_count,
        "true_duplicates_removed": dup_count,
        "clean_records": int(len(internships)),
        "records_balance_ok": raw_count - dup_count == len(internships),
        "unique_students": int(len(students)),
        "students_with_1_internship": int((counts == 1).sum()),
        "students_with_2_internships": int((counts == 2).sum()),
        "students_with_3_internships": int((counts == 3).sum()),
        "students_with_4plus_internships": int((counts >= 4).sum()),
        "internship_records_from_counts": int(counts.sum()),
    }


def _write_csv(frame: pd.DataFrame, name: str) -> None:
    out = frame.copy()
    for c in out.columns:
        if pd.api.types.is_datetime64_any_dtype(out[c]):
            out[c] = out[c].dt.strftime("%Y-%m-%d")
    out.to_csv(config.OUTPUT_DIR / name, index=False, encoding="utf-8-sig")


def run_pipeline(verbose: bool = True) -> dict:
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    raw = load_raw()

    profile, profile_df = profile_raw(raw)
    (config.OUTPUT_DIR / "phase1_profile.json").write_text(json.dumps(profile, indent=2, default=str), encoding="utf-8")
    profile_df.to_csv(config.OUTPUT_DIR / "phase1_profile.csv", index=False, encoding="utf-8-sig")

    clean = clean_records(raw)
    empty_cols = clean.attrs.get("empty_columns", [])
    clean, duplicates = split_duplicates(clean, raw)
    clean = assign_student_ids(clean)
    ambiguous = find_ambiguous(clean)

    students = build_student_master(clean)
    internships = build_internships(clean)
    companies = build_entity_master(internships, "Company", "Company", "Company_Name")
    roles = build_entity_master(internships, "Role", "Role", "Role_Name")
    locations = build_location_master(students, internships)
    summary_tbl = build_student_summary(students, internships)

    quality = pd.concat([
        data_quality_table(raw.drop(columns=["Source_Row"]).map(clean_text), "raw_source"),
        data_quality_table(internships, "internship_professional"),
        data_quality_table(students, "student_master"),
    ], ignore_index=True)

    recon = reconciliation(len(raw), len(duplicates), students, internships)
    multi = int((students["Internship_Count"] > 1).sum())
    summary = {
        "raw_records": int(len(raw)),
        "clean_records": int(len(internships)),
        "unique_students": int(len(students)),
        "unique_companies": int(len(companies)),
        "unique_roles": int(len(roles)),
        "unique_locations": int(len(locations)),
        "exact_duplicates_removed": int(len(duplicates)),
        "ambiguous_records": int(len(ambiguous)),
        "students_with_multiple_internships": multi,
        "missing_stipend": int(internships["Stipend_Amount"].isna().sum()),
        "non_inr_stipend_records": int((internships["Stipend_Currency"] == "USD").sum()),
        "unpaid_records": int(internships["Unpaid"].sum()),
        "total_stipend_mismatches": int(internships["Total_Stipend_Mismatch"].sum()),
        "invalid_joining_dates": int(internships["Joining_Date_Invalid"].sum()),
        "invalid_end_dates": int(internships["Tenure_End_Date_Invalid"].sum()),
        "invalid_extension_dates": int(internships["Extension_Date_Invalid"].sum()),
        "month_ref_errors": int(internships["Month_Ref_Error"].sum()),
        "missing_status": int(internships["Status"].isna().sum()),
        "students_missing_location": int(students["State"].isna().sum()),
        "students_missing_contact": int(students["Contact"].isna().sum()),
        "students_missing_linkedin": int(students["LinkedIn"].isna().sum()),
        "empty_source_columns_dropped": empty_cols,
        "company_names_merged": {
            r["Company_Name"]: r["Raw_Variants"] for _, r in companies.iterrows()
            if pd.notna(r["Raw_Variants"]) and r["Raw_Variants"] != r["Company_Name"]
        },
        "reconciliation": recon,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    _write_csv(students, "student_master.csv")
    _write_csv(internships, "internship_professional.csv")
    _write_csv(companies, "company_master.csv")
    _write_csv(roles, "role_master.csv")
    _write_csv(locations, "location_master.csv")
    _write_csv(summary_tbl, "student_summary.csv")
    _write_csv(duplicates, "duplicate_records.csv")
    _write_csv(ambiguous, "ambiguous_records.csv")
    quality.to_csv(config.OUTPUT_DIR / "data_quality_report.csv", index=False, encoding="utf-8-sig")
    (config.OUTPUT_DIR / "data_quality_summary.json").write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
    (config.OUTPUT_DIR / "reconciliation_report.json").write_text(json.dumps(recon, indent=2), encoding="utf-8")

    if verbose:
        print("Pipeline complete ->", config.OUTPUT_DIR)
        for k, v in recon.items():
            print(f"  {k:34s} {v}")
        print(f"  {'ambiguous_records':34s} {len(ambiguous)}")
        print(f"  {'unique_companies':34s} {len(companies)}")
        print(f"  {'unique_roles':34s} {len(roles)}")
    return summary


if __name__ == "__main__":
    run_pipeline()
