export type ApplicationStatus =
  | "new"
  | "screening"
  | "needs_review"
  | "shortlisted"
  | "rejected";

export type ParsingStatus = "pending" | "parsed" | "needs_review" | "failed";

export type CriterionScore = {
  id: "skills" | "experience" | "education" | "certifications";
  label: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  notes: string;
};

export type ParsedProfile = {
  parsingStatus: ParsingStatus;
  parserConfidence: number;
  skills: string[];
  experienceYears: number;
  education: string;
  certifications: string[];
  workHistory: {
    company: string;
    role: string;
    dates: string;
  }[];
  missingFields: string[];
};

export type Applicant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  source: string;
  appliedAt: string;
  jobId: string;
  cvFileName: string;
  status: ApplicationStatus;
  parsedProfile: ParsedProfile;
  scores: CriterionScore[];
  reviewerNote: string;
};

export type JobPosting = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  closingDate: string;
  requiredSkills: string[];
};

export type ReportFilter = {
  dateRange: "7d" | "30d" | "90d";
  status: "all" | ApplicationStatus;
  minimumScore: number;
};
