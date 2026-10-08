# Student & Internship Analytics Dashboard — Batch 2024

A local web application for analysing the 2024 batch internship sheet. Everything runs on
your computer: no cloud services, no external APIs, no AI services, and no student data
leaves the machine.

- **Backend:** Python 3.10+, FastAPI, Pandas, NumPy, Pydantic, Uvicorn
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide, Axios

| What | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

## Quick start (Windows)

Double-click **`start.bat`**. On the first run it:

1. creates `backend\venv` and installs the Python packages,
2. runs the data pipeline if `outputs\` is empty,
3. runs `npm install` in `frontend\`,
4. starts the API and the web app in two windows and opens the browser.

To stop the app, close the two server windows.

## Manual start

Backend (terminal 1):

```bat
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python data_processing.py
uvicorn main:app --reload --port 8000
```

Frontend (terminal 2):

```bat
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173.

> If `npm` fails with `EPERM ... lstat 'C:\Users\<other user>'`, your PATH points to an nvm
> install from another user profile. Use the system Node instead:
> `set PATH=%ProgramFiles%\nodejs;%PATH%` (`start.bat` already does this).

## Tests

```bat
cd backend
venv\Scripts\activate
python test_data.py            :: prints the reconciliation report, then runs the tests
python -m pytest test_data.py -v
```

```bat
cd frontend
npm run build                  :: type-check + production build
```

## Project structure

```
student-internship-dashboard/
├── data/
│   ├── Internship Batch 2024 - Sheet1.csv   source data (exported once from the .xlsx, never modified)
│   └── source_cell_comments.csv             Excel cell comments, kept as record notes
├── backend/
│   ├── config.py            paths, explicit alias lists, constants
│   ├── data_processing.py   profiling + cleaning pipeline -> outputs/
│   ├── analytics.py         filtering and aggregations used by the API
│   ├── models.py            Pydantic request/response models
│   ├── main.py              FastAPI app and endpoints
│   ├── test_data.py         data + API tests, reconciliation report
│   └── requirements.txt
├── frontend/src/
│   ├── components/  Layout, Sidebar, FilterPanel, DataTable, KPI/Card UI, states
│   ├── charts/      reusable Recharts wrappers
│   ├── pages/       one file per route
│   ├── hooks/       useApi, global filter context
│   ├── services/    Axios API client
│   ├── types/       TypeScript API types
│   └── utils/       formatting, CSV helpers
├── outputs/         generated CSV/JSON (see below)
├── start.bat
└── README.md
```

## Data pipeline

`backend/data_processing.py` is reproducible. Run it again after updating the CSV.

| Output | Contents |
|---|---|
| `phase1_profile.json/.csv` | raw dataset profile: shape, columns, types, missing values, unique counts, repeated students |
| `student_master.csv` | one row per student (`STU0001`…) |
| `internship_professional.csv` | every legitimate internship record (`INT0001`…), with the original values kept next to the cleaned ones |
| `company_master.csv`, `role_master.csv`, `location_master.csv` | entity masters with record and student counts |
| `student_summary.csv` | one row per student with companies, roles, stipend min/avg/max and latest status |
| `duplicate_records.csv` | rows removed as exact duplicates (all original columns identical) |
| `ambiguous_records.csv` | rows kept but flagged for review, with the reason |
| `data_quality_report.csv`, `data_quality_summary.json`, `reconciliation_report.json` | data quality and reconciliation |
| `student_id_map.csv` | identity key → Student_ID. Keeps IDs the same across re-runs |

### Decisions about the data

The source sheet does not exactly match the field list in the original specification. These are
the decisions taken, and each one is visible in the UI or the outputs:

- **Source file.** The data was supplied as `Copy of Internship Batch 2024.xlsx`. Sheet1 was exported
  once to `data/Internship Batch 2024 - Sheet1.csv`. The workbook is not modified.
- **Student identity.** There is no enrolment-number column, so the university email (`@medhaviskillsuniversity.edu.in`)
  is the identity key. If an email is missing, the fallback order is contact number, then name. Name
  spelling variants and conflicting contact numbers under the same email are kept and flagged in
  `ambiguous_records.csv`.
- **Duplicates.** Only rows identical in every original column are removed. Students who appear
  several times have different companies or dates, so every record is kept.
- **Stipend.** Stipends are monthly INR. A missing stipend stays missing and is never counted as 0. An
  explicit `0` is treated as a known unpaid internship. `375 USD` is kept as recorded and left out of
  INR statistics, because no exchange rate is assumed.
- **Country.** The sheet's `Country` column is where the internship is based (for example UAE or Kenya),
  so it is labelled *Internship Country*. The student's *home* country is derived as India only when the
  home State is a recorded Indian state.
- **Month.** 30 cells contain `#REF!`. The joining month is derived from the `Joining` date instead.
- **Dates.** Mixed date formats are parsed. Impossible dates such as "31st June 2026" are counted as
  invalid and kept as text.
- **Companies.** Only an explicit alias list in `config.py` is used to merge names (Zuvees.AE→Zuvees,
  Tamashaa→Tamasha, casing variants, and so on). The original name is kept in `Company_Raw`. Role
  titles are merged only when they differ by case or spacing.
- **Joining location.** Values are split into city and work mode, and Bangalore/Banglore/Bengaluru
  spellings are unified.
- **Operations fields.** The sheet has *Founder's Letter* (not a founder call), *Parent Call*, *3 Screen
  Displays*, *Digital Photo* and *Offer Letter* columns. Process status is based on those 4 onboarding
  steps. Ledger Signing, Polaris Merch Unlock and Campus Credit Card are empty in the source and are
  only reported.
- **Student picture.** The sheet has no per-student picture, so profiles show initials.
- **Students without internship.** Students whose only records are *Offer Rejected*.

## API endpoints

All analytics endpoints accept the global filters as query parameters: `student, gender, state,
city, batch, company, role, status, joining_location, date_from, date_to, stipend_min, stipend_max`.
List endpoints also accept `search, sort_by, sort_dir, page, page_size`.

`GET /api/health`, `/api/summary`, `/api/filters`, `/api/students`, `/api/students/{id}`,
`/api/student/{id}/internships`, `/api/internships`, `/api/companies`, `/api/roles`,
`/api/demographics`, `/api/stipend`, `/api/operations`, `/api/data-quality`,
`/api/export/students`, `/api/export/internships`

## Privacy

The dataset holds personal information (names, emails, phone numbers). `.gitignore` excludes
`data/` and `outputs/` from source control. The API listens on `localhost` only, and CORS
allows only the local dashboard origin.
