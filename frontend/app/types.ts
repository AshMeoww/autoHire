export type ModuleId =
  | "submission"
  | "parsing"
  | "screening"
  | "reporting"
  | "jobs"
  | "notifications";

export type ApplicationStatus =
  | "new"
  | "screening"
  | "needs_review"
  | "shortlisted"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export type ParsingStatus = "pending" | "parsed" | "needs_review" | "failed";

export type JobPostingStatus = "draft" | "active" | "closed";

export type CriterionId = "skills" | "experience" | "education" | "certifications";

export type CriteriaWeights = Record<CriterionId, number>;

export type CriterionScore = {
  id: CriterionId;
  label: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  notes: string;
};

export type SupplementaryQuestion = {
  id: string;
  prompt: string;
  type: "short_answer" | "multiple_choice";
  required: boolean;
  options?: string[];
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
  status: JobPostingStatus;
  description: string;
  requirements: string[];
  requiredSkills: string[];
  criteriaWeights: CriteriaWeights;
  supplementaryQuestions: SupplementaryQuestion[];
};

export type NotificationTemplate = {
  id: string;
  status: ApplicationStatus;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
};

export type NotificationLog = {
  id: string;
  applicantId: string;
  applicantName: string;
  status: ApplicationStatus;
  templateName: string;
  sentAt: string;
  deliveryStatus: "queued" | "sent" | "failed";
};

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  role: "applicant";
  createdAt: string;
};

export type ReportFilter = {
  dateRange: "7d" | "30d" | "90d";
  status: "all" | ApplicationStatus;
  minimumScore: number;
};
