import type { Applicant, CriterionScore, JobPosting, ReportFilter } from "./types";

const weightMap = {
  skills: 0.4,
  experience: 0.3,
  education: 0.2,
  certifications: 0.1,
} as const;

type ScoreInput = {
  skills: number;
  experience: number;
  education: number;
  certifications: number;
};

export const scoreApplicants = (scores: ScoreInput): CriterionScore[] => [
  {
    id: "skills",
    label: "Skills",
    weight: weightMap.skills,
    rawScore: scores.skills,
    weightedScore: scores.skills * weightMap.skills,
    notes: "Match against required mechanical, diagnostics, safety, and track operations skills.",
  },
  {
    id: "experience",
    label: "Experience",
    weight: weightMap.experience,
    rawScore: scores.experience,
    weightedScore: scores.experience * weightMap.experience,
    notes: "Years and relevance of workshop, motorsport, or high-volume service experience.",
  },
  {
    id: "education",
    label: "Education",
    weight: weightMap.education,
    rawScore: scores.education,
    weightedScore: scores.education * weightMap.education,
    notes: "Automotive, engineering, or technical education aligned with role requirements.",
  },
  {
    id: "certifications",
    label: "Certifications",
    weight: weightMap.certifications,
    rawScore: scores.certifications,
    weightedScore: scores.certifications * weightMap.certifications,
    notes: "ASE, safety, first aid, electrical, or other role-relevant certificates.",
  },
];

export const totalScore = (scores: CriterionScore[]) =>
  Math.round(scores.reduce((sum, criterion) => sum + criterion.weightedScore, 0));

export const activeJobPosting: JobPosting = {
  id: "job-track-tech-01",
  title: "AutoMotion Track Operations Technician",
  department: "Operations",
  location: "Operations campus, Cavite",
  employmentType: "Full-time",
  closingDate: "2026-06-30",
  requiredSkills: [
    "Vehicle diagnostics",
    "Preventive maintenance",
    "Track safety",
    "Customer handoff",
    "Basic telemetry",
  ],
};

export const initialReportFilter: ReportFilter = {
  dateRange: "30d",
  status: "all",
  minimumScore: 70,
};

export const initialApplicants: Applicant[] = [
  {
    id: "AM-1027",
    name: "Mara Santos",
    email: "mara.santos@example.com",
    phone: "+63 917 405 1188",
    location: "Imus, Cavite",
    source: "Referral",
    appliedAt: "2026-05-27",
    jobId: activeJobPosting.id,
    cvFileName: "Mara_Santos_CV.pdf",
    status: "shortlisted",
    parsedProfile: {
      parsingStatus: "parsed",
      parserConfidence: 96,
      skills: ["Vehicle diagnostics", "Track safety", "Preventive maintenance", "Customer handoff"],
      experienceYears: 6,
      education: "BS Mechanical Engineering, De La Salle University",
      certifications: ["BOSH Safety Officer 2", "Automotive Service NC II"],
      workHistory: [
        { company: "Velocity Works", role: "Senior Service Advisor", dates: "2022-2026" },
        { company: "Southline Motors", role: "Automotive Technician", dates: "2019-2022" },
      ],
      missingFields: [],
    },
    scores: scoreApplicants({ skills: 94, experience: 88, education: 92, certifications: 86 }),
    reviewerNote: "Strong diagnostics and safety fit. Prioritize for panel interview.",
  },
  {
    id: "AM-1031",
    name: "Jules Navarro",
    email: "jules.navarro@example.com",
    phone: "+63 995 210 9020",
    location: "Taguig City",
    source: "LinkedIn",
    appliedAt: "2026-05-28",
    jobId: activeJobPosting.id,
    cvFileName: "JNavarro_resume.pdf",
    status: "needs_review",
    parsedProfile: {
      parsingStatus: "needs_review",
      parserConfidence: 71,
      skills: ["Basic telemetry", "Electrical systems", "Vehicle diagnostics"],
      experienceYears: 4,
      education: "Diploma in Automotive Technology",
      certifications: ["First Aid", "EV Safety Awareness"],
      workHistory: [
        { company: "Apex Karting", role: "Pit Crew Coordinator", dates: "2023-2026" },
        { company: "Metro Auto Hub", role: "Junior Technician", dates: "2021-2023" },
      ],
      missingFields: ["Full school name", "Supervisor reference"],
    },
    scores: scoreApplicants({ skills: 86, experience: 76, education: 74, certifications: 79 }),
    reviewerNote: "Parsing missed education detail. Good motorsport-adjacent experience.",
  },
  {
    id: "AM-1034",
    name: "Kaye Lim",
    email: "kaye.lim@example.com",
    phone: "+63 908 771 0034",
    location: "Las Pinas",
    source: "Careers page",
    appliedAt: "2026-05-29",
    jobId: activeJobPosting.id,
    cvFileName: "KayeLim_Automotive.pdf",
    status: "screening",
    parsedProfile: {
      parsingStatus: "pending",
      parserConfidence: 42,
      skills: ["Customer handoff", "Preventive maintenance"],
      experienceYears: 2,
      education: "BS Industrial Technology",
      certifications: ["Automotive Service NC I"],
      workHistory: [{ company: "North Garage", role: "Service Reception Associate", dates: "2024-2026" }],
      missingFields: ["Detailed work history", "Skills section confirmation"],
    },
    scores: scoreApplicants({ skills: 68, experience: 58, education: 76, certifications: 60 }),
    reviewerNote: "Await parser completion before final decision.",
  },
  {
    id: "AM-1038",
    name: "Nico Reyes",
    email: "nico.reyes@example.com",
    phone: "+63 922 185 4441",
    location: "Makati City",
    source: "Job board",
    appliedAt: "2026-05-29",
    jobId: activeJobPosting.id,
    cvFileName: "Nico_Reyes.pdf",
    status: "new",
    parsedProfile: {
      parsingStatus: "failed",
      parserConfidence: 18,
      skills: ["Vehicle detailing", "Inventory control"],
      experienceYears: 1,
      education: "High school graduate",
      certifications: [],
      workHistory: [{ company: "City Auto Care", role: "Detailing Assistant", dates: "2025-2026" }],
      missingFields: ["Readable CV text", "Certifications", "Education date"],
    },
    scores: scoreApplicants({ skills: 46, experience: 38, education: 42, certifications: 0 }),
    reviewerNote: "Image-only CV. Needs manual data entry before ranking is reliable.",
  },
  {
    id: "AM-1040",
    name: "Ari Mendoza",
    email: "ari.mendoza@example.com",
    phone: "+63 917 612 8742",
    location: "Paranaque City",
    source: "Referral",
    appliedAt: "2026-05-30",
    jobId: activeJobPosting.id,
    cvFileName: "Ari_Mendoza_Profile.pdf",
    status: "shortlisted",
    parsedProfile: {
      parsingStatus: "parsed",
      parserConfidence: 93,
      skills: ["Track safety", "Vehicle diagnostics", "Basic telemetry", "Preventive maintenance"],
      experienceYears: 7,
      education: "BS Electrical Engineering",
      certifications: ["First Aid", "Motorsport Marshal Training", "BOSH Safety Officer 1"],
      workHistory: [
        { company: "Circuit South", role: "Track Systems Technician", dates: "2021-2026" },
        { company: "Torque Lab", role: "Electrical Technician", dates: "2018-2021" },
      ],
      missingFields: [],
    },
    scores: scoreApplicants({ skills: 91, experience: 93, education: 88, certifications: 92 }),
    reviewerNote: "Best blend of track systems and technician experience.",
  },
];
