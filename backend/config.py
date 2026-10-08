from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "outputs"

RAW_CSV = DATA_DIR / "Internship Batch 2024 - Sheet1.csv"
# Original workbook supplied by the user; only used to (re)create RAW_CSV and read cell comments.
SOURCE_XLSX = BASE_DIR.parent / "file" / "Copy of Internship Batch 2024.xlsx"
CELL_COMMENTS_CSV = DATA_DIR / "source_cell_comments.csv"

UNIVERSITY_EMAIL_DOMAIN = "medhaviskillsuniversity.edu.in"

FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

# Explicit, reviewed company aliases (key = lower-cased, punctuation/space-stripped raw name).
# Only spelling/casing/suffix variants that clearly refer to the same organisation are merged.
COMPANY_ALIASES = {
    "zuveesae": "Zuvees",
    "zuvees": "Zuvees",
    "tamashaa": "Tamasha",
    "tamasha": "Tamasha",
    "bluestockin": "BlueStock.in",
    "autometaai": "Autometa AI",
    "bharatlineage": "Bharat Lineage",
    "bharatlineageprivatelimited": "Bharat Lineage",
    "codibleventuresllpinternshipcontract": "Codible Ventures LLP",
}

# Every State value in the sheet is an Indian state/UT; used only to derive the student's home country.
INDIAN_STATES = {
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Chandigarh", "Puducherry", "Lakshadweep",
    "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu",
}

# Joining-location city spelling variants.
LOCATION_CITY_ALIASES = {
    "banglore": "Bengaluru",
    "bangalore": "Bengaluru",
    "bengaluru": "Bengaluru",
    "gurgaon": "Gurugram",
    "gurugram": "Gurugram",
    "delhi": "Delhi",
    "lucknow": "Lucknow",
}

# Onboarding process steps that contain data in the sheet (fully empty steps are reported, not scored).
PROCESS_STEP_COLUMNS = {
    "Screen_Display": "3 Screen Displays (Step 3 - Ashwin)",
    "Digital_Photo_Given": "Give Digital Photo  to Students (Karthik)",
    "Founder_Letter": "Founder’s Letter (Step 4 - Amla + Rohan)",
    "Parent_Call": "Parent Call (Step 5 - Batch Manager)",
}

# Internship statuses that mean the student did NOT take up the internship.
NON_INTERNSHIP_STATUSES = {"Offer Rejected"}
