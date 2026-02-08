// City data from data/cities.json
export interface City {
  name: string;
  slug: string;
  state: string;
  tier: 1 | 2;
  coordinates: {
    lat: number;
    lng: number;
  };
  airport: string;
  nearestHub: string | null;
  status: CityStatus;
}

export type CityStatus =
  | "new"
  | "researching"
  | "content-bank-ready"
  | "content-bank-approved"
  | "generating"
  | "generated"
  | "validated"
  | "content-complete";

// Content bank from data/content-banks/{city}.json
export interface ContentBank {
  city: string;
  cityName: string;
  createdAt: string;
  updatedAt: string;
  researchSources: string[];
  categories: ContentBankCategory[];
  pages: ContentBankPage[];
  notes: string;
}

export interface ContentBankCategory {
  id: string;
  name: string;
  slug: string;
  hasCategoryPage: boolean;
  hasHubPage?: boolean;
  categoryPageTitle?: string;
}

export interface ContentBankPage {
  id: string;
  type: "hub" | "category" | "paa";
  category: string;
  title: string;
  slug: string;
  contentDirection: string;
  status: PageStatus;
  wordCount: number | null;
  generatedAt: string | null;
  validationErrors: string[];
}

export type PageStatus =
  | "not-started"
  | "generating"
  | "generated"
  | "validation-failed"
  | "validated"
  | "published";

// Dashboard status response
export interface DashboardStatus {
  cities: CityDashboardItem[];
  apiUsage: {
    researchCallsToday: number;
    generationCallsToday: number;
  };
  currentJob: JobInfo | null;
}

export interface CityDashboardItem {
  slug: string;
  name: string;
  status: CityStatus;
  totalPages: number;
  generated: number;
  validated: number;
  published: number;
}

export interface JobInfo {
  type: "research" | "generation";
  city: string;
  startedAt: string;
  progress?: {
    current: number;
    total: number;
  };
}

// Admin state from data/admin-state.json
export interface AdminState {
  lastUpdated: string;
  apiCalls: {
    research: { total: number; today: number };
    generation: { total: number; today: number };
  };
  currentJob: JobInfo | null;
  jobHistory: JobHistoryEntry[];
}

export interface JobHistoryEntry {
  type: "research" | "generation";
  city: string;
  startedAt: string;
  completedAt: string;
  pagesDiscovered?: number;
  pagesGenerated?: number;
  status: "completed" | "failed" | "cancelled";
}

// Generation result from API
export interface GeneratePageResult {
  status: "success" | "error";
  file?: string;
  wordCount?: number;
  elapsed?: string;
  committed?: boolean;
  commitSha?: string;
  error?: string;
}

// Validation result from API
export interface ValidationApiResult {
  city: string;
  totalFiles: number;
  passed: number;
  failed: number;
  errors: FileValidationError[];
}

export interface FileValidationError {
  file: string;
  errors: {
    type: string;
    value?: string;
    limit?: number;
    actual?: number;
    line?: number;
    message?: string;
  }[];
}
