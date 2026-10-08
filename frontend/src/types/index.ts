export interface NameValue {
  name: string;
  value: number;
  [key: string]: string | number | null | undefined;
}

export interface Filters {
  student?: string;
  gender?: string;
  state?: string;
  city?: string;
  batch?: string;
  company?: string;
  role?: string;
  status?: string;
  joining_location?: string;
  date_from?: string;
  date_to?: string;
  stipend_min?: string;
  stipend_max?: string;
}

export interface PageQuery {
  search?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface FilterOptions {
  students: { Student_ID: string; Name: string }[];
  genders: string[];
  states: string[];
  cities: string[];
  batches: string[];
  companies: string[];
  roles: string[];
  statuses: string[];
  joining_locations: string[];
  date_min: string | null;
  date_max: string | null;
  stipend_min: number | null;
  stipend_max: number | null;
}

export interface SummaryResponse {
  kpis: {
    total_students: number;
    total_internship_records: number;
    students_with_internship: number;
    students_without_internship: number;
    students_with_multiple_internships: number;
    companies: number;
    roles: number;
    average_stipend: number | null;
    median_stipend: number | null;
    known_stipend_records: number;
  };
  charts: {
    gender: NameValue[];
    status: NameValue[];
    top_companies: NameValue[];
    top_roles: NameValue[];
    joining_months: NameValue[];
    states: NameValue[];
  };
  insights: string[];
}

export interface StudentRow {
  Student_ID: string;
  Name: string;
  Gender: string | null;
  Email: string | null;
  Contact: string | null;
  City: string | null;
  State: string | null;
  Country: string | null;
  Company_Count: number;
  Internship_Count: number;
  Accepted_Internship_Count: number;
  Latest_Company: string | null;
  Latest_Status: string | null;
}

export interface Internship {
  Internship_ID: string;
  Student_ID: string;
  Source_Row: number;
  Name: string;
  Company: string | null;
  Company_Raw: string | null;
  Role: string | null;
  Internship_Country: string | null;
  Joining_Location: string | null;
  Work_Mode: string | null;
  Joining_Date: string | null;
  Academic_Year: string | null;
  Status: string | null;
  Stipend: number | null;
  Stipend_Amount: number | null;
  Stipend_Currency: string | null;
  Stipend_Raw: string | null;
  Tenure_Months: number | null;
  Total_Stipend: number | null;
  Tenure_End_Date: string | null;
  Tenure_End_Date_Raw: string | null;
  Offer_Letter_Available: boolean;
  Offer_Letter_File: string | null;
  Stipend_Increase: string | null;
  Is_Extended: boolean;
  Extension_Raw: string | null;
  Extension_Letter_File: string | null;
  Screen_Display: boolean;
  Digital_Photo_Given: boolean;
  Founder_Letter: boolean;
  Parent_Call: boolean;
  Parent_Call_By: string | null;
  Process_Steps_Completed: number;
  Process_Status: string;
  Feedback: string | null;
  Notes: string | null;
}

export interface StudentDetail {
  profile: {
    Student_ID: string;
    Name: string;
    Gender: string | null;
    Email: string | null;
    Contact: string | null;
    Alternate_Contacts: string | null;
    City: string | null;
    State: string | null;
    Country: string | null;
    LinkedIn: string | null;
    Student_Picture: string | null;
    Batch: string | null;
    Name_Variants: string | null;
    Internship_Countries: string[];
  };
  kpis: {
    internship_count: number;
    company_count: number;
    average_stipend: number | null;
    known_stipend_records: number;
    latest_internship: string | null;
    latest_status: string | null;
  };
  internships: Internship[];
  data_flags: { Source_Row: number; Company: string; Reason: string }[];
}

export type Row = Record<string, string | number | boolean | null>;

export interface InternshipsResponse {
  kpis: {
    total_records: number;
    unique_companies: number;
    unique_roles: number;
    avg_internships_per_student: number;
    students_with_multiple: number;
    students: number;
  };
  charts: Record<
    'top_companies' | 'top_roles' | 'status' | 'joining_months' | 'joining_locations' | 'work_mode' | 'tenure' | 'internship_country',
    NameValue[]
  >;
  records: Paginated<Row>;
}

export interface CompaniesResponse {
  kpis: { companies: number; roles: number; repeat_employers: number; single_hire_companies: number };
  charts: {
    by_students: NameValue[];
    by_records: NameValue[];
    top_roles: NameValue[];
    company_role: { company: string; role: string; value: number }[];
  };
  table: Paginated<Row>;
}

export interface DemographicsResponse {
  kpis: { students: number; states: number; cities: number; location_recorded: number; location_missing: number };
  charts: {
    gender: NameValue[];
    states: NameValue[];
    cities: NameValue[];
    home_country: NameValue[];
    internship_country: NameValue[];
    gender_by_state: Row[];
  };
  notes: string[];
}

export interface StipendGroup extends NameValue {
  records: number;
  min: number;
  max: number;
}

export interface StipendResponse {
  stats: {
    average: number | null;
    median: number | null;
    minimum: number | null;
    maximum: number | null;
    total_committed: number | null;
    known_count: number;
    missing_count: number;
    non_inr_count: number;
    unpaid_count: number;
  };
  charts: {
    distribution: NameValue[];
    known_vs_missing: NameValue[];
    by_company: StipendGroup[];
    by_role: StipendGroup[];
    by_location: StipendGroup[];
    by_work_mode: StipendGroup[];
    by_month: NameValue[];
  };
  non_inr_records: Row[];
  notes: string[];
}

export interface OperationsResponse {
  kpis: {
    records: number;
    offer_accepted: number;
    extended: number;
    offer_letters: number;
    parent_calls: number;
    process_completed: number;
  };
  charts: {
    status: NameValue[];
    joining_timeline: NameValue[];
    extension: NameValue[];
    extension_by_status: NameValue[];
    offer_letter: NameValue[];
    process_status: NameValue[];
    process_steps: { name: string; done: number; pending: number }[];
    work_mode: NameValue[];
    joining_locations: NameValue[];
    academic_year: NameValue[];
  };
  extended_records: Row[];
  ending_soon: Row[];
  notes: string[];
}

export interface DataQualityResponse {
  summary: Record<string, unknown> & {
    raw_records: number;
    clean_records: number;
    unique_students: number;
    unique_companies: number;
    unique_roles: number;
    unique_locations: number;
    exact_duplicates_removed: number;
    ambiguous_records: number;
    students_with_multiple_internships: number;
    missing_stipend: number;
    non_inr_stipend_records: number;
    invalid_joining_dates: number;
    invalid_end_dates: number;
    invalid_extension_dates: number;
    month_ref_errors: number;
    missing_status: number;
    students_missing_location: number;
    students_missing_contact: number;
    empty_source_columns_dropped: string[];
    company_names_merged: Record<string, string>;
    reconciliation: Record<string, number | boolean>;
    generated_at: string;
  };
  quality_table: Row[];
  missing_by_column: { name: string; value: number; pct: number }[];
  duplicates: Row[];
  ambiguous: Row[];
}
