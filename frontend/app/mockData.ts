import type {
  Applicant,
  ApplicationStatus,
  CriteriaWeights,
  CriterionScore,
  JobPosting,
  NotificationLog,
  NotificationTemplate,
  ReportFilter,
  UserAccount,
} from "./types";

export const defaultCriteriaWeights: CriteriaWeights = {
  skills: 0.4,
  experience: 0.3,
  education: 0.2,
  certifications: 0.1,
};

type ScoreInput = {
  skills: number;
  experience: number;
  education: number;
  certifications: number;
};

const criterionNotes = {
  skills: "Match against role skills, safety practices, and operational requirements.",
  experience: "Years and relevance of workshop, service, or track operations experience.",
  education: "Education or training aligned with the role requirements.",
  certifications: "Safety, automotive, technical, or other role-relevant certificates.",
};

export const normalizeWeights = (weights: CriteriaWeights): CriteriaWeights => {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

  if (total <= 0) return defaultCriteriaWeights;

  return {
    skills: weights.skills / total,
    experience: weights.experience / total,
    education: weights.education / total,
    certifications: weights.certifications / total,
  };
};

export const scoreApplicants = (
  scores: ScoreInput,
  weights: CriteriaWeights = defaultCriteriaWeights,
): CriterionScore[] => {
  const normalizedWeights = normalizeWeights(weights);

  return [
    {
      id: "skills",
      label: "Skills",
      weight: normalizedWeights.skills,
      rawScore: scores.skills,
      weightedScore: scores.skills * normalizedWeights.skills,
      notes: criterionNotes.skills,
    },
    {
      id: "experience",
      label: "Experience",
      weight: normalizedWeights.experience,
      rawScore: scores.experience,
      weightedScore: scores.experience * normalizedWeights.experience,
      notes: criterionNotes.experience,
    },
    {
      id: "education",
      label: "Education",
      weight: normalizedWeights.education,
      rawScore: scores.education,
      weightedScore: scores.education * normalizedWeights.education,
      notes: criterionNotes.education,
    },
    {
      id: "certifications",
      label: "Certifications",
      weight: normalizedWeights.certifications,
      rawScore: scores.certifications,
      weightedScore: scores.certifications * normalizedWeights.certifications,
      notes: criterionNotes.certifications,
    },
  ];
};

export const rescoreWithWeights = (scores: CriterionScore[], weights: CriteriaWeights) =>
  scoreApplicants(
    {
      skills: scores.find((score) => score.id === "skills")?.rawScore ?? 0,
      experience: scores.find((score) => score.id === "experience")?.rawScore ?? 0,
      education: scores.find((score) => score.id === "education")?.rawScore ?? 0,
      certifications: scores.find((score) => score.id === "certifications")?.rawScore ?? 0,
    },
    weights,
  );

export const totalScore = (scores: CriterionScore[]) =>
  Math.round(scores.reduce((sum, criterion) => sum + criterion.weightedScore, 0));

export const initialJobPostings: JobPosting[] = [
  {
    id: "job-track-tech-01",
    title: "AutoMotion Track Operations Technician",
    department: "Operations",
    location: "Operations campus, Cavite",
    employmentType: "Full-time",
    closingDate: "2026-06-30",
    status: "active",
    description:
      "Support daily track operations, vehicle readiness, safety checks, and applicant-facing service handoffs.",
    requirements: [
      "Automotive diagnostics or maintenance experience",
      "Comfortable with weekend operations",
      "Can follow safety procedures under time pressure",
    ],
    requiredSkills: [
      "Vehicle diagnostics",
      "Preventive maintenance",
      "Track safety",
      "Customer handoff",
      "Basic telemetry",
    ],
    criteriaWeights: defaultCriteriaWeights,
    supplementaryQuestions: [
      {
        id: "q-weekend",
        prompt: "Are you available for weekend and event-day operations?",
        type: "multiple_choice",
        required: true,
        options: ["Yes", "Sometimes", "No"],
      },
      {
        id: "q-safety",
        prompt: "Describe one safety procedure you follow before releasing a vehicle.",
        type: "short_answer",
        required: true,
      },
    ],
  },
  {
    id: "job-guest-host-02",
    title: "Guest Experience Associate",
    department: "Customer Experience",
    location: "Operations campus, Cavite",
    employmentType: "Part-time",
    closingDate: "2026-07-15",
    status: "draft",
    description: "Guide guests through registration, queueing, briefing, and post-session support.",
    requirements: ["Customer service experience", "Clear communication", "Comfortable with point-of-sale tools"],
    requiredSkills: ["Customer support", "Queue management", "Safety briefing", "POS handling"],
    criteriaWeights: {
      skills: 0.35,
      experience: 0.25,
      education: 0.15,
      certifications: 0.25,
    },
    supplementaryQuestions: [
      {
        id: "q-service",
        prompt: "How would you calm a frustrated guest during a long queue?",
        type: "short_answer",
        required: true,
      },
    ],
  },
  {
    id: "job-marshal-03",
    title: "Race Marshal",
    department: "Track Safety",
    location: "Operations campus, Cavite",
    employmentType: "Contract",
    closingDate: "2026-05-20",
    status: "closed",
    description: "Monitor track activity, support flagging, and coordinate incident response.",
    requirements: ["Track safety awareness", "First aid preferred", "Can work in high-noise environments"],
    requiredSkills: ["Track safety", "Incident response", "Radio communication", "First aid"],
    criteriaWeights: {
      skills: 0.45,
      experience: 0.25,
      education: 0.1,
      certifications: 0.2,
    },
    supplementaryQuestions: [
      {
        id: "q-incident",
        prompt: "What is your first action when an on-track incident occurs?",
        type: "short_answer",
        required: true,
      },
    ],
  },
];

export const activeJobPosting = initialJobPostings[0];

export const initialReportFilter: ReportFilter = {
  dateRange: "30d",
  status: "all",
  minimumScore: 70,
};

export const initialUsers: UserAccount[] = [
  {
    id: "user-001",
    name: "Jordan Cruz",
    email: "candidate@example.com",
    role: "applicant",
    createdAt: "2026-05-30",
  },
  {
    id: "user-002",
    name: "Kaye Lim",
    email: "kaye.lim@example.com",
    role: "applicant",
    createdAt: "2026-05-29",
  },
];

export const initialNotificationTemplates: NotificationTemplate[] = [
  {
    id: "tpl-received",
    status: "screening",
    name: "Application received",
    subject: "We received your application",
    body: "Hi {{name}}, your application for {{jobTitle}} was received and is now in screening.",
    enabled: true,
  },
  {
    id: "tpl-review",
    status: "needs_review",
    name: "Application under review",
    subject: "Your application is being reviewed",
    body: "Hi {{name}}, our HR team is manually reviewing your submitted profile.",
    enabled: true,
  },
  {
    id: "tpl-shortlist",
    status: "shortlisted",
    name: "Shortlisted candidate",
    subject: "You have been shortlisted",
    body: "Hi {{name}}, congratulations. You have been shortlisted for the next recruitment step.",
    enabled: true,
  },
  {
    id: "tpl-interview",
    status: "interview",
    name: "Interview coordination",
    subject: "Interview coordination",
    body: "Hi {{name}}, HR will contact you to coordinate your interview schedule.",
    enabled: true,
  },
  {
    id: "tpl-rejected",
    status: "rejected",
    name: "Application update",
    subject: "Application status update",
    body: "Hi {{name}}, thank you for applying. We will not be moving forward at this time.",
    enabled: true,
  },
];

export const initialNotificationLogs: NotificationLog[] = [
  {
    id: "log-001",
    applicantId: "AM-1027",
    applicantName: "Mara Santos",
    status: "shortlisted",
    templateName: "Shortlisted candidate",
    sentAt: "2026-05-27 14:40",
    deliveryStatus: "sent",
  },
  {
    id: "log-002",
    applicantId: "AM-1031",
    applicantName: "Jules Navarro",
    status: "needs_review",
    templateName: "Application under review",
    sentAt: "2026-05-28 10:15",
    deliveryStatus: "sent",
  },
];

export const notificationStatuses: ApplicationStatus[] = [
  "screening",
  "needs_review",
  "shortlisted",
  "interview",
  "rejected",
];

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
    reviewerNote: "Parsing missed education detail. Good operations-adjacent experience.",
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
    status: "interview",
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
  {
    id: "AM-1044",
    name: "Tala Cruz",
    email: "tala.cruz@example.com",
    phone: "+63 917 444 1122",
    location: "Quezon City",
    source: "Walk-in kiosk",
    appliedAt: "2026-05-30",
    jobId: "job-guest-host-02",
    cvFileName: "Tala_Cruz_Service.docx",
    status: "offer",
    parsedProfile: {
      parsingStatus: "parsed",
      parserConfidence: 89,
      skills: ["Customer support", "Queue management", "Safety briefing", "POS handling"],
      experienceYears: 5,
      education: "BS Hospitality Management",
      certifications: ["Basic First Aid"],
      workHistory: [{ company: "North Arcade", role: "Guest Relations Lead", dates: "2021-2026" }],
      missingFields: [],
    },
    scores: scoreApplicants({ skills: 90, experience: 84, education: 83, certifications: 75 }),
    reviewerNote: "Strong guest operations background; mock offer pending.",
  },
];
