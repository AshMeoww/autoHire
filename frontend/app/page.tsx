"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  activeJobPosting,
  initialApplicants,
  initialJobPostings,
  initialNotificationLogs,
  initialNotificationTemplates,
  initialReportFilter,
  initialUsers,
  notificationStatuses,
  normalizeWeights,
  rescoreWithWeights,
  scoreApplicants,
  totalScore,
} from "./mockData";
import type {
  Applicant,
  ApplicationStatus,
  CriteriaWeights,
  JobPosting,
  JobPostingStatus,
  ModuleId,
  NotificationLog,
  NotificationTemplate,
  ParsingStatus,
  ReportFilter,
  UserAccount,
} from "./types";

type Screen = ModuleId | "detail" | "confirmation" | "user-login" | "user-signup" | "user-portal";
type StatusFilter = "all" | ApplicationStatus;
type ParsingFilter = "all" | ParsingStatus;

const modules: { id: ModuleId; label: string; eyebrow: string }[] = [
  { id: "submission", label: "Submission", eyebrow: "Applicant intake" },
  { id: "parsing", label: "CV Parsing", eyebrow: "Extraction review" },
  { id: "screening", label: "Screening", eyebrow: "Scores and ranking" },
  { id: "reporting", label: "Reporting", eyebrow: "Dashboard and exports" },
  { id: "jobs", label: "Jobs", eyebrow: "Posting setup" },
  { id: "notifications", label: "Notifications", eyebrow: "Templates and logs" },
];

const statusLabels: Record<ApplicationStatus, string> = {
  new: "New",
  screening: "Screening",
  needs_review: "Needs review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const parsingLabels: Record<ParsingStatus, string> = {
  pending: "Pending",
  parsed: "Parsed",
  needs_review: "Needs review",
  failed: "Failed",
};

const statusTone: Record<ApplicationStatus, string> = {
  new: "bg-emerald-50 text-emerald-700",
  screening: "bg-blue-50 text-blue-700",
  needs_review: "bg-amber-50 text-amber-700",
  shortlisted: "bg-violet-50 text-violet-700",
  interview: "bg-cyan-50 text-cyan-700",
  offer: "bg-fuchsia-50 text-fuchsia-700",
  hired: "bg-zinc-950 text-white",
  rejected: "bg-zinc-100 text-zinc-600",
};

const parserTone: Record<ParsingStatus, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  parsed: "bg-emerald-50 text-emerald-700",
  needs_review: "bg-amber-50 text-amber-700",
  failed: "bg-rose-50 text-rose-700",
};

const jobStatusTone: Record<JobPostingStatus, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  active: "bg-emerald-50 text-emerald-700",
  closed: "bg-rose-50 text-rose-700",
};

const applicationStatuses = Object.keys(statusLabels) as ApplicationStatus[];
const parsingStatuses = Object.keys(parsingLabels) as ParsingStatus[];

const scoreClass = (score: number) => {
  if (score >= 85) return "text-emerald-700";
  if (score >= 70) return "text-violet-700";
  return "text-rose-700";
};

const formatWeight = (weight: number) => `${Math.round(weight * 100)}%`;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("reporting");
  const [applicants, setApplicants] = useState<Applicant[]>(initialApplicants);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>(initialJobPostings);
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(initialUsers[0]);
  const [activeJobId, setActiveJobId] = useState(activeJobPosting.id);
  const [selectedJobId, setSelectedJobId] = useState(activeJobPosting.id);
  const [selectedApplicantId, setSelectedApplicantId] = useState(initialApplicants[0].id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [parsingFilter, setParsingFilter] = useState<ParsingFilter>("all");
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState(75);
  const [reportFilter, setReportFilter] = useState<ReportFilter>(initialReportFilter);
  const [submittedName, setSubmittedName] = useState("Jordan Cruz");
  const [submittedEmail, setSubmittedEmail] = useState("candidate@example.com");
  const [exportReady, setExportReady] = useState(false);
  const [notificationTemplates, setNotificationTemplates] =
    useState<NotificationTemplate[]>(initialNotificationTemplates);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>(initialNotificationLogs);

  const activeJob = jobPostings.find((job) => job.id === activeJobId) ?? jobPostings[0];
  const selectedJob = jobPostings.find((job) => job.id === selectedJobId) ?? activeJob;
  const selectedApplicant =
    applicants.find((applicant) => applicant.id === selectedApplicantId) ?? applicants[0];

  const applicantsWithScores = useMemo(
    () =>
      applicants.map((applicant) => ({
        ...applicant,
        scores: rescoreWithWeights(applicant.scores, activeJob.criteriaWeights),
      })),
    [activeJob.criteriaWeights, applicants],
  );

  const activeJobApplicants = applicantsWithScores.filter((applicant) => applicant.jobId === activeJob.id);

  const rankedApplicants = [...activeJobApplicants].sort((a, b) => totalScore(b.scores) - totalScore(a.scores));

  const filteredApplicants = rankedApplicants.filter((applicant) => {
    const haystack = `${applicant.name} ${applicant.email} ${applicant.source} ${applicant.parsedProfile.skills.join(" ")}`;
    return (
      (statusFilter === "all" || applicant.status === statusFilter) &&
      (parsingFilter === "all" || applicant.parsedProfile.parsingStatus === parsingFilter) &&
      totalScore(applicant.scores) >= threshold - 25 &&
      haystack.toLowerCase().includes(query.toLowerCase())
    );
  });

  const metrics = {
    visible: filteredApplicants.length,
    total: activeJobApplicants.length,
    averageScore: Math.round(
      activeJobApplicants.reduce((sum, applicant) => sum + totalScore(applicant.scores), 0) /
        Math.max(activeJobApplicants.length, 1),
    ),
    parsingQueue: activeJobApplicants.filter((applicant) => applicant.parsedProfile.parsingStatus !== "parsed").length,
    shortlisted: activeJobApplicants.filter((applicant) => applicant.status === "shortlisted").length,
  };

  const addNotificationLog = (applicant: Applicant, status: ApplicationStatus) => {
    const template = notificationTemplates.find((item) => item.status === status && item.enabled);

    if (!template) return;

    const log: NotificationLog = {
      id: `log-${String(notificationLogs.length + 1).padStart(3, "0")}`,
      applicantId: applicant.id,
      applicantName: applicant.name,
      status,
      templateName: template.name,
      sentAt: "2026-05-30 15:30",
      deliveryStatus: "sent",
    };

    setNotificationLogs((current) => [log, ...current]);
  };

  const updateApplicant = (id: string, update: Partial<Applicant>, sendNotification = false) => {
    const target = applicants.find((applicant) => applicant.id === id);

    if (target && update.status && update.status !== target.status && sendNotification) {
      addNotificationLog(target, update.status);
    }

    setApplicants((current) =>
      current.map((applicant) => (applicant.id === id ? { ...applicant, ...update } : applicant)),
    );
  };

  const updateApplicantStatus = (id: string, status: ApplicationStatus) => {
    updateApplicant(id, { status }, true);
  };

  const approveParsedData = (id: string) => {
    const target = applicants.find((applicant) => applicant.id === id);
    if (!target) return;

    updateApplicant(id, {
      status: target.status === "new" ? "screening" : target.status,
      parsedProfile: {
        ...target.parsedProfile,
        parsingStatus: "parsed",
        parserConfidence: Math.max(target.parsedProfile.parserConfidence, 88),
        missingFields: [],
      },
    });
  };

  const updateJob = (id: string, update: Partial<JobPosting>) => {
    setJobPostings((current) => current.map((job) => (job.id === id ? { ...job, ...update } : job)));
  };

  const addDraftJob = () => {
    const nextId = `job-draft-${jobPostings.length + 1}`;
    const draft: JobPosting = {
      ...activeJob,
      id: nextId,
      title: "New Job Posting",
      status: "draft",
      closingDate: "2026-07-30",
      supplementaryQuestions: activeJob.supplementaryQuestions.map((question, index) => ({
        ...question,
        id: `${nextId}-q-${index + 1}`,
      })),
    };

    setJobPostings((current) => [draft, ...current]);
    setSelectedJobId(nextId);
  };

  const handleSubmitApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const newApplicant: Applicant = {
      id: `AM-${1041 + applicants.length}`,
      name: submittedName || currentUser?.name || "New Applicant",
      email: submittedEmail || currentUser?.email || "candidate@example.com",
      phone: "+63 900 111 2222",
      location: "Metro Manila",
      source: "Careers page",
      appliedAt: "2026-05-30",
      jobId: activeJob.id,
      cvFileName: "Candidate_CV.pdf",
      status: "screening",
      parsedProfile: {
        parsingStatus: "pending",
        parserConfidence: 0,
        skills: activeJob.requiredSkills.slice(0, 2),
        experienceYears: 3,
        education: "Technical automotive diploma",
        certifications: ["Automotive Service NC II"],
        workHistory: [{ company: "Applicant provided", role: "Operations technician", dates: "2023-2026" }],
        missingFields: ["Parser run pending", "Work history validation"],
      },
      scores: scoreApplicants({ skills: 74, experience: 66, education: 72, certifications: 70 }, activeJob.criteriaWeights),
      reviewerNote: "New portal submission. Parser state is simulated as pending.",
    };

    setApplicants((current) => [newApplicant, ...current]);
    setSelectedApplicantId(newApplicant.id);
    addNotificationLog(newApplicant, "screening");
    setScreen("confirmation");
  };

  const handleUserLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const user = users.find((account) => account.email === submittedEmail) ?? users[0];
    setCurrentUser(user);
    setSubmittedName(user.name);
    setSubmittedEmail(user.email);
    setScreen("user-portal");
  };

  const handleUserSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newUser: UserAccount = {
      id: `user-${String(users.length + 1).padStart(3, "0")}`,
      name: submittedName || "New Applicant",
      email: submittedEmail || "candidate@example.com",
      role: "applicant",
      createdAt: "2026-05-30",
    };

    setUsers((current) => [newUser, ...current]);
    setCurrentUser(newUser);
    setScreen("user-portal");
  };

  return (
    <main className="min-h-screen bg-[#f8f8fb] text-zinc-950">
      <AppShell
        activeModule={modules.some((module) => module.id === screen) ? (screen as ModuleId) : undefined}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        setScreen={setScreen}
      >
        {screen === "user-login" && (
          <UserAuthModule
            mode="login"
            onSubmit={handleUserLogin}
            setScreen={setScreen}
            setSubmittedEmail={setSubmittedEmail}
            setSubmittedName={setSubmittedName}
            submittedEmail={submittedEmail}
            submittedName={submittedName}
          />
        )}

        {screen === "user-signup" && (
          <UserAuthModule
            mode="signup"
            onSubmit={handleUserSignup}
            setScreen={setScreen}
            setSubmittedEmail={setSubmittedEmail}
            setSubmittedName={setSubmittedName}
            submittedEmail={submittedEmail}
            submittedName={submittedName}
          />
        )}

        {screen === "user-portal" && (
          <UserPortalModule
            activeJobs={jobPostings.filter((job) => job.status === "active")}
            applicants={applicants.filter((applicant) => applicant.email === currentUser?.email)}
            currentUser={currentUser}
            setScreen={setScreen}
            startApplication={(jobId) => {
              setActiveJobId(jobId);
              if (currentUser) {
                setSubmittedName(currentUser.name);
                setSubmittedEmail(currentUser.email);
              }
              setScreen("submission");
            }}
          />
        )}

        {screen === "submission" && (
          <SubmissionModule
            activeJob={activeJob}
            onSubmit={handleSubmitApplication}
            setSubmittedEmail={setSubmittedEmail}
            setSubmittedName={setSubmittedName}
            submittedEmail={submittedEmail}
            submittedName={submittedName}
          />
        )}

        {screen === "confirmation" && selectedApplicant && (
          <ConfirmationModule applicant={selectedApplicant} setScreen={setScreen} />
        )}

        {screen === "parsing" && (
          <ParsingModule applicants={activeJobApplicants} approveParsedData={approveParsedData} setApplicantDetail={setSelectedApplicantId} setScreen={setScreen} />
        )}

        {screen === "screening" && (
          <ScreeningModule
            activeJob={activeJob}
            applicants={filteredApplicants}
            metrics={metrics}
            query={query}
            setApplicantDetail={setSelectedApplicantId}
            setQuery={setQuery}
            setScreen={setScreen}
            setStatusFilter={setStatusFilter}
            setThreshold={setThreshold}
            statusFilter={statusFilter}
            threshold={threshold}
            updateApplicantStatus={updateApplicantStatus}
          />
        )}

        {screen === "reporting" && (
          <ReportingModule
            activeJob={activeJob}
            applicants={filteredApplicants}
            allApplicants={activeJobApplicants}
            exportReady={exportReady}
            metrics={metrics}
            parsingFilter={parsingFilter}
            query={query}
            reportFilter={reportFilter}
            setExportReady={setExportReady}
            setParsingFilter={setParsingFilter}
            setQuery={setQuery}
            setReportFilter={setReportFilter}
            setScreen={setScreen}
            setStatusFilter={setStatusFilter}
            setThreshold={setThreshold}
            statusFilter={statusFilter}
            threshold={threshold}
            updateApplicantStatus={updateApplicantStatus}
            viewApplicant={(id) => {
              setSelectedApplicantId(id);
              setScreen("detail");
            }}
          />
        )}

        {screen === "jobs" && (
          <JobsModule
            activeJobId={activeJobId}
            addDraftJob={addDraftJob}
            jobPostings={jobPostings}
            selectedJob={selectedJob}
            setActiveJobId={setActiveJobId}
            setSelectedJobId={setSelectedJobId}
            updateJob={updateJob}
          />
        )}

        {screen === "notifications" && (
          <NotificationsModule
            logs={notificationLogs}
            setTemplates={setNotificationTemplates}
            templates={notificationTemplates}
          />
        )}

        {screen === "detail" && selectedApplicant && (
          <ApplicantDetailModule
            applicant={selectedApplicant}
            scores={rescoreWithWeights(selectedApplicant.scores, activeJob.criteriaWeights)}
            threshold={threshold}
            approveParsedData={approveParsedData}
            setScreen={setScreen}
            updateApplicant={updateApplicant}
            updateApplicantStatus={updateApplicantStatus}
          />
        )}
      </AppShell>
    </main>
  );
}

function AppShell({
  activeModule,
  children,
  currentUser,
  setCurrentUser,
  setScreen,
}: {
  activeModule?: ModuleId;
  children: ReactNode;
  currentUser: UserAccount | null;
  setCurrentUser: (user: UserAccount | null) => void;
  setScreen: (screen: Screen) => void;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-[1480px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/95 backdrop-blur">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <button className="flex items-center gap-3 text-left" onClick={() => setScreen("reporting")}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-sm font-black text-white">
              A
            </span>
            <span>
              <span className="block text-xl font-black tracking-tight">AutoHire</span>
              <span className="block text-xs text-zinc-500">Application screening system</span>
            </span>
          </button>

          <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-zinc-50 p-1">
            {modules.map((module) => (
              <button
                className={`h-10 shrink-0 rounded-xl px-4 text-sm font-medium transition ${
                  activeModule === module.id
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-zinc-600 hover:bg-white hover:text-zinc-950"
                }`}
                key={module.id}
                onClick={() => setScreen(module.id)}
                title={module.eyebrow}
              >
                {module.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-500 sm:block">
              Frontend-only mock
            </div>
            {currentUser ? (
              <button
                className="rounded-2xl border border-violet-100 bg-violet-50 px-3 py-2 text-left"
                onClick={() => setScreen("user-portal")}
              >
                <span className="block text-sm font-semibold text-violet-800">{currentUser.name}</span>
                <span className="block text-xs text-violet-600">Applicant portal</span>
              </button>
            ) : (
              <button
                className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white"
                onClick={() => setScreen("user-login")}
              >
                User login
              </button>
            )}
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 px-3 py-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-sm font-black text-violet-700">
                HR
              </span>
              <span className="hidden sm:block">
                <span className="block text-sm font-semibold">Hiring Team</span>
                <span className="block text-xs text-zinc-500">Reviewer</span>
              </span>
            </div>
            {currentUser && (
              <button
                className="hidden h-10 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-600 sm:block"
                onClick={() => setCurrentUser(null)}
              >
                Log out
              </button>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function UserAuthModule({
  mode,
  onSubmit,
  setScreen,
  setSubmittedEmail,
  setSubmittedName,
  submittedEmail,
  submittedName,
}: {
  mode: "login" | "signup";
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setScreen: (screen: Screen) => void;
  setSubmittedEmail: (email: string) => void;
  setSubmittedName: (name: string) => void;
  submittedEmail: string;
  submittedName: string;
}) {
  const isSignup = mode === "signup";

  return (
    <section className="grid min-h-[calc(100vh-82px)] place-items-center bg-[#fbfbfd] p-4 sm:p-6">
      <form className="w-full max-w-md rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm" onSubmit={onSubmit}>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 font-black text-violet-700">
          U
        </div>
        <h1 className="mt-5 text-center text-2xl font-black tracking-tight">
          {isSignup ? "Create applicant account" : "Log in as applicant"}
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Frontend-only portal access. No real authentication or password storage in this prototype.
        </p>

        <div className="mt-6 space-y-4">
          {isSignup && (
            <Field label="Full name">
              <input className="ui-input" onChange={(event) => setSubmittedName(event.target.value)} value={submittedName} />
            </Field>
          )}
          <Field label="Email">
            <input className="ui-input" onChange={(event) => setSubmittedEmail(event.target.value)} type="email" value={submittedEmail} />
          </Field>
          <Field label="Password">
            <input className="ui-input" defaultValue="applicant-demo" type="password" />
          </Field>
        </div>

        <button className="mt-6 h-11 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700">
          {isSignup ? "Create account" : "Log in"}
        </button>
        <button
          className="mt-3 h-11 w-full rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          onClick={() => setScreen(isSignup ? "user-login" : "user-signup")}
          type="button"
        >
          {isSignup ? "I already have an account" : "Create a new applicant account"}
        </button>
      </form>
    </section>
  );
}

function UserPortalModule({
  activeJobs,
  applicants,
  currentUser,
  setScreen,
  startApplication,
}: {
  activeJobs: JobPosting[];
  applicants: Applicant[];
  currentUser: UserAccount | null;
  setScreen: (screen: Screen) => void;
  startApplication: (jobId: string) => void;
}) {
  if (!currentUser) {
    return (
      <ModulePage
        eyebrow="Applicant portal"
        title="Sign in required"
        description="Log in or create an applicant account to view your applications."
        action={
          <button className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white" onClick={() => setScreen("user-login")}>
            User login
          </button>
        }
      >
        <div className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">The portal is a local mock, but it separates applicant access from the HR modules.</p>
        </div>
      </ModulePage>
    );
  }

  return (
    <ModulePage
      eyebrow="Applicant portal"
      title={`Welcome, ${currentUser.name}`}
      description="Track your submitted applications, review parser status, and start a new application from active postings."
      action={
        <button className="h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold" onClick={() => setScreen("submission")}>
          Continue application
        </button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black tracking-tight">My applications</h2>
          <div className="mt-5 space-y-3">
            {applicants.length ? (
              applicants.map((applicant) => (
                <div className="rounded-2xl bg-zinc-50 p-4" key={applicant.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black">{applicant.cvFileName}</p>
                      <p className="mt-1 text-sm text-zinc-500">Submitted {applicant.appliedAt}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Pill className={statusTone[applicant.status]}>{statusLabels[applicant.status]}</Pill>
                      <Pill className={parserTone[applicant.parsedProfile.parsingStatus]}>
                        {parsingLabels[applicant.parsedProfile.parsingStatus]}
                      </Pill>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <InfoTile label="Application ID" value={applicant.id} />
                    <InfoTile label="Score status" value="HR review only" />
                    <InfoTile label="Source" value={applicant.source} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-500">
                No submitted applications yet. Choose an active posting to start.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black tracking-tight">Active jobs</h2>
            <div className="mt-5 space-y-3">
              {activeJobs.map((job) => (
                <button className="w-full rounded-2xl bg-zinc-50 p-4 text-left hover:bg-violet-50" key={job.id} onClick={() => startApplication(job.id)}>
                  <p className="font-black">{job.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">{job.department} - {job.employmentType}</p>
                  <p className="mt-3 text-sm font-semibold text-violet-700">Apply now</p>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black tracking-tight">Account</h2>
            <div className="mt-4 space-y-3">
              <InfoTile label="Name" value={currentUser.name} />
              <InfoTile label="Email" value={currentUser.email} />
              <InfoTile label="Created" value={currentUser.createdAt} />
            </div>
          </section>
        </aside>
      </div>
    </ModulePage>
  );
}

function SubmissionModule({
  activeJob,
  onSubmit,
  setSubmittedEmail,
  setSubmittedName,
  submittedEmail,
  submittedName,
}: {
  activeJob: JobPosting;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setSubmittedEmail: (email: string) => void;
  setSubmittedName: (name: string) => void;
  submittedEmail: string;
  submittedName: string;
}) {
  return (
    <section className="bg-[#fbfbfd] p-4 sm:p-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-[28px] bg-zinc-950 p-6 text-white">
          <p className="text-sm font-semibold text-violet-200">Module 1</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Applicant submission</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            Public-facing intake with file validation simulation, structured details, and job-specific questions.
          </p>
          <div className="mt-8 space-y-3">
            <StepItem active label="Personal details" />
            <StepItem active label="CV upload" />
            <StepItem active label="Supplementary questions" />
            <StepItem label="Status confirmation" />
          </div>
        </aside>

        <form className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm sm:p-7" onSubmit={onSubmit}>
          <ModuleHeader
            eyebrow="Active posting"
            title={activeJob.title}
            description={`${activeJob.department} - ${activeJob.location} - ${activeJob.employmentType}`}
          />

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input className="ui-input" onChange={(event) => setSubmittedName(event.target.value)} value={submittedName} />
            </Field>
            <Field label="Email">
              <input className="ui-input" onChange={(event) => setSubmittedEmail(event.target.value)} type="email" value={submittedEmail} />
            </Field>
            <Field label="Phone">
              <input className="ui-input" defaultValue="+63 900 111 2222" />
            </Field>
            <Field label="Location">
              <input className="ui-input" defaultValue="Metro Manila" />
            </Field>
            <Field label="Highest education">
              <select className="ui-input bg-white" defaultValue="Technical automotive diploma">
                <option>Technical automotive diploma</option>
                <option>Bachelor degree</option>
                <option>Senior high school</option>
              </select>
            </Field>
            <Field label="Years of experience">
              <input className="ui-input" defaultValue="3" min="0" type="number" />
            </Field>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <Field label="CV upload">
              <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-5">
                <p className="font-semibold text-zinc-950">Candidate_CV.pdf</p>
                <p className="mt-1 text-sm text-zinc-500">PDF/DOCX accepted. Size and type validation are simulated.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SubtleTag>PDF ready</SubtleTag>
                  <SubtleTag>Parser pending</SubtleTag>
                </div>
              </div>
            </Field>
            <Field label="Declared skills">
              <div className="flex min-h-36 flex-wrap content-start gap-2 rounded-2xl border border-zinc-200 p-3">
                {activeJob.requiredSkills.map((skill) => (
                  <label className="flex items-center gap-2 rounded-full bg-zinc-50 px-3 py-2 text-sm" key={skill}>
                    <input className="accent-violet-600" defaultChecked type="checkbox" />
                    {skill}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {activeJob.supplementaryQuestions.map((question) => (
              <Field label={question.prompt} key={question.id}>
                {question.type === "multiple_choice" ? (
                  <select className="ui-input bg-white">
                    {question.options?.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <textarea className="ui-textarea" defaultValue="I follow a checklist, confirm safety items, and escalate unclear issues." />
                )}
              </Field>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">Submitting creates a local mock record and notification log.</p>
            <button className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700">
              Submit application
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ConfirmationModule({
  applicant,
  setScreen,
}: {
  applicant: Applicant;
  setScreen: (screen: Screen) => void;
}) {
  return (
    <section className="bg-[#fbfbfd] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm sm:p-8">
        <Pill className="bg-emerald-50 text-emerald-700">Submission received</Pill>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Thanks, {applicant.name}.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          The candidate is now available in the parsing queue, scoring list, dashboard, and notification log.
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-4">
          <ProcessStep active detail="Application record created" title="Submitted" />
          <ProcessStep active detail={parsingLabels[applicant.parsedProfile.parsingStatus]} title="CV parsing" />
          <ProcessStep detail="Ranking queue" title="HR review" />
          <ProcessStep detail="Status email simulated" title="Notification" />
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <InfoTile label="Application ID" value={applicant.id} />
          <InfoTile label="Upload" value={applicant.cvFileName} />
          <InfoTile label="Status" value={statusLabels[applicant.status]} />
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white" onClick={() => setScreen("parsing")}>
            Open parsing queue
          </button>
          <button className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-semibold" onClick={() => setScreen("reporting")}>
            Open dashboard
          </button>
        </div>
      </div>
    </section>
  );
}

function ParsingModule({
  applicants,
  approveParsedData,
  setApplicantDetail,
  setScreen,
}: {
  applicants: Applicant[];
  approveParsedData: (id: string) => void;
  setApplicantDetail: (id: string) => void;
  setScreen: (screen: Screen) => void;
}) {
  const queue = applicants.filter((applicant) => applicant.parsedProfile.parsingStatus !== "parsed");

  return (
    <ModulePage
      eyebrow="Module 2"
      title="CV parsing and data extraction"
      description="Review parser confidence, missing fields, failed extractions, and approve corrected profile data."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Needs HR review" value={queue.length.toString()} />
        <MetricTile label="Failed parses" value={applicants.filter((item) => item.parsedProfile.parsingStatus === "failed").length.toString()} />
        <MetricTile label="Approved profiles" value={applicants.filter((item) => item.parsedProfile.parsingStatus === "parsed").length.toString()} />
      </div>

      <div className="mt-5 grid gap-4">
        {applicants.map((applicant) => (
          <article className="rounded-[24px] border border-zinc-100 bg-white p-5 shadow-sm" key={applicant.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black">{applicant.name}</h2>
                  <Pill className={parserTone[applicant.parsedProfile.parsingStatus]}>
                    {parsingLabels[applicant.parsedProfile.parsingStatus]}
                  </Pill>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {applicant.cvFileName} - Confidence {applicant.parsedProfile.parserConfidence}%
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-semibold"
                  onClick={() => {
                    setApplicantDetail(applicant.id);
                    setScreen("detail");
                  }}
                >
                  Manual review
                </button>
                <button
                  className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white"
                  onClick={() => approveParsedData(applicant.id)}
                >
                  Approve parsed data
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm font-semibold">Extracted data</p>
                <p className="mt-2 text-sm text-zinc-600">{applicant.parsedProfile.education}</p>
                <p className="mt-1 text-sm text-zinc-600">{applicant.parsedProfile.experienceYears} years experience</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {applicant.parsedProfile.skills.map((skill) => (
                    <SubtleTag key={skill}>{skill}</SubtleTag>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Warnings</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {applicant.parsedProfile.missingFields.length ? (
                    applicant.parsedProfile.missingFields.map((field) => (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700" key={field}>
                        {field}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-amber-700">No missing fields.</span>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </ModulePage>
  );
}

function ScreeningModule({
  activeJob,
  applicants,
  metrics,
  query,
  setApplicantDetail,
  setQuery,
  setScreen,
  setStatusFilter,
  setThreshold,
  statusFilter,
  threshold,
  updateApplicantStatus,
}: {
  activeJob: JobPosting;
  applicants: Applicant[];
  metrics: { averageScore: number; parsingQueue: number; shortlisted: number; total: number; visible: number };
  query: string;
  setApplicantDetail: (id: string) => void;
  setQuery: (query: string) => void;
  setScreen: (screen: Screen) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setThreshold: (threshold: number) => void;
  statusFilter: StatusFilter;
  threshold: number;
  updateApplicantStatus: (id: string, status: ApplicationStatus) => void;
}) {
  return (
    <section className="grid min-h-[calc(100vh-82px)] lg:grid-cols-[280px_1fr]">
      <ScreeningFilters
        applicants={applicants}
        query={query}
        setQuery={setQuery}
        setStatusFilter={setStatusFilter}
        setThreshold={setThreshold}
        statusFilter={statusFilter}
        threshold={threshold}
      />
      <div className="border-l border-zinc-100 bg-[#fbfbfd] p-4 sm:p-6">
        <ModuleHeader
          eyebrow="Module 3"
          title="Screening and scoring"
          description={`${activeJob.title} uses ${formatWeight(activeJob.criteriaWeights.skills)} skills, ${formatWeight(activeJob.criteriaWeights.experience)} experience, ${formatWeight(activeJob.criteriaWeights.education)} education, and ${formatWeight(activeJob.criteriaWeights.certifications)} certifications.`}
        />
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MetricTile label="Ranked applicants" value={metrics.visible.toString()} />
          <MetricTile label="Average score" value={`${metrics.averageScore}%`} />
          <MetricTile label="Shortlisted" value={metrics.shortlisted.toString()} />
          <MetricTile label="Parser queue" value={metrics.parsingQueue.toString()} />
        </div>
        <div className="mt-5 space-y-4">
          {applicants.map((applicant, index) => (
            <CandidateCard
              applicant={applicant}
              key={applicant.id}
              rank={index + 1}
              selectApplicant={(id) => {
                setApplicantDetail(id);
                setScreen("detail");
              }}
              updateApplicantStatus={updateApplicantStatus}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportingModule({
  activeJob,
  applicants,
  allApplicants,
  exportReady,
  metrics,
  parsingFilter,
  query,
  reportFilter,
  setExportReady,
  setParsingFilter,
  setQuery,
  setReportFilter,
  setScreen,
  setStatusFilter,
  setThreshold,
  statusFilter,
  threshold,
  updateApplicantStatus,
  viewApplicant,
}: {
  activeJob: JobPosting;
  applicants: Applicant[];
  allApplicants: Applicant[];
  exportReady: boolean;
  metrics: { averageScore: number; parsingQueue: number; shortlisted: number; total: number; visible: number };
  parsingFilter: ParsingFilter;
  query: string;
  reportFilter: ReportFilter;
  setExportReady: (ready: boolean) => void;
  setParsingFilter: (status: ParsingFilter) => void;
  setQuery: (query: string) => void;
  setReportFilter: (filter: ReportFilter) => void;
  setScreen: (screen: Screen) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setThreshold: (threshold: number) => void;
  statusFilter: StatusFilter;
  threshold: number;
  updateApplicantStatus: (id: string, status: ApplicationStatus) => void;
  viewApplicant: (id: string) => void;
}) {
  return (
    <section className="grid min-h-[calc(100vh-82px)] lg:grid-cols-[280px_1fr]">
      <ReportingFilters
        applicants={allApplicants}
        parsingFilter={parsingFilter}
        query={query}
        setParsingFilter={setParsingFilter}
        setQuery={setQuery}
        setStatusFilter={setStatusFilter}
        setThreshold={setThreshold}
        statusFilter={statusFilter}
        threshold={threshold}
      />
      <div className="border-l border-zinc-100 bg-[#fbfbfd] p-4 sm:p-6">
        <div className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <ModuleHeader
              eyebrow="Module 4"
              title="Dashboard and reporting"
              description={`Centralized applicant view for ${activeJob.title}.`}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold"
                onClick={() => setScreen("screening")}
              >
                Open scoring
              </button>
              <button
                className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white"
                onClick={() => setScreen("submission")}
              >
                Add candidate
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Candidates" value={metrics.total.toString()} />
            <MetricTile label="Visible" value={metrics.visible.toString()} />
            <MetricTile label="Avg. score" value={`${metrics.averageScore}%`} />
            <MetricTile label="Parser queue" value={metrics.parsingQueue.toString()} />
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {applicants.map((applicant, index) => (
              <CandidateCard
                applicant={applicant}
                key={applicant.id}
                rank={index + 1}
                selectApplicant={viewApplicant}
                updateApplicantStatus={updateApplicantStatus}
              />
            ))}
          </div>
          <aside className="space-y-5">
            <AnalyticsPanel applicants={allApplicants} />
            <ExportPanel
              applicants={allApplicants}
              exportReady={exportReady}
              reportFilter={reportFilter}
              setExportReady={setExportReady}
              setReportFilter={setReportFilter}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}

function JobsModule({
  activeJobId,
  addDraftJob,
  jobPostings,
  selectedJob,
  setActiveJobId,
  setSelectedJobId,
  updateJob,
}: {
  activeJobId: string;
  addDraftJob: () => void;
  jobPostings: JobPosting[];
  selectedJob: JobPosting;
  setActiveJobId: (id: string) => void;
  setSelectedJobId: (id: string) => void;
  updateJob: (id: string, update: Partial<JobPosting>) => void;
}) {
  const normalized = normalizeWeights(selectedJob.criteriaWeights);

  const updateWeight = (key: keyof CriteriaWeights, value: number) => {
    updateJob(selectedJob.id, {
      criteriaWeights: {
        ...selectedJob.criteriaWeights,
        [key]: value / 100,
      },
    });
  };

  return (
    <ModulePage
      eyebrow="Module 5"
      title="Job posting management"
      description="Create, publish, archive, and tune job criteria that drive the screening score."
      action={
        <button className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white" onClick={addDraftJob}>
          New draft
        </button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          {jobPostings.map((job) => (
            <button
              className={`w-full rounded-[22px] border p-4 text-left transition ${
                selectedJob.id === job.id ? "border-violet-200 bg-violet-50" : "border-zinc-100 bg-white hover:bg-zinc-50"
              }`}
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-black">{job.title}</p>
                <Pill className={jobStatusTone[job.status]}>{job.status}</Pill>
              </div>
              <p className="mt-2 text-sm text-zinc-500">{job.department} - closes {job.closingDate}</p>
              {activeJobId === job.id && <p className="mt-2 text-xs font-semibold text-violet-700">Used for scoring</p>}
            </button>
          ))}
        </div>

        <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">{selectedJob.title}</h2>
              <p className="mt-1 text-sm text-zinc-500">{selectedJob.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-semibold"
                onClick={() => setActiveJobId(selectedJob.id)}
              >
                Use for scoring
              </button>
              <button
                className="h-10 rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700"
                onClick={() => updateJob(selectedJob.id, { status: "active" })}
              >
                Publish
              </button>
              <button
                className="h-10 rounded-xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-600"
                onClick={() => updateJob(selectedJob.id, { status: "closed" })}
              >
                Archive
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input className="ui-input" value={selectedJob.title} onChange={(event) => updateJob(selectedJob.id, { title: event.target.value })} />
            </Field>
            <Field label="Department">
              <input className="ui-input" value={selectedJob.department} onChange={(event) => updateJob(selectedJob.id, { department: event.target.value })} />
            </Field>
            <Field label="Location">
              <input className="ui-input" value={selectedJob.location} onChange={(event) => updateJob(selectedJob.id, { location: event.target.value })} />
            </Field>
            <Field label="Closing date">
              <input className="ui-input" value={selectedJob.closingDate} onChange={(event) => updateJob(selectedJob.id, { closingDate: event.target.value })} />
            </Field>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <h3 className="font-black">Criteria weights</h3>
              <p className="mt-1 text-sm text-zinc-500">Raw weights are editable; scoring auto-normalizes them.</p>
              <div className="mt-4 space-y-4">
                {(Object.keys(selectedJob.criteriaWeights) as (keyof CriteriaWeights)[]).map((key) => (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold capitalize">{key}</span>
                      <span className="text-sm font-black">{formatWeight(normalized[key])}</span>
                    </div>
                    <input
                      className="mt-2 w-full accent-violet-600"
                      min="0"
                      max="80"
                      type="range"
                      value={Math.round(selectedJob.criteriaWeights[key] * 100)}
                      onChange={(event) => updateWeight(key, Number(event.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <h3 className="font-black">Supplementary questions</h3>
              <div className="mt-4 space-y-3">
                {selectedJob.supplementaryQuestions.map((question, index) => (
                  <Field label={`Question ${index + 1}`} key={question.id}>
                    <input
                      className="ui-input bg-white"
                      value={question.prompt}
                      onChange={(event) => {
                        const questions = selectedJob.supplementaryQuestions.map((item) =>
                          item.id === question.id ? { ...item, prompt: event.target.value } : item,
                        );
                        updateJob(selectedJob.id, { supplementaryQuestions: questions });
                      }}
                    />
                  </Field>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ModulePage>
  );
}

function NotificationsModule({
  logs,
  setTemplates,
  templates,
}: {
  logs: NotificationLog[];
  setTemplates: (templates: NotificationTemplate[]) => void;
  templates: NotificationTemplate[];
}) {
  const updateTemplate = (id: string, update: Partial<NotificationTemplate>) => {
    setTemplates(templates.map((template) => (template.id === id ? { ...template, ...update } : template)));
  };

  return (
    <ModulePage
      eyebrow="Module 6"
      title="Notification module"
      description="Configure status-triggered email templates and inspect the simulated delivery log."
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black tracking-tight">Template manager</h2>
          <div className="mt-5 space-y-4">
            {templates.map((template) => (
              <div className="rounded-2xl bg-zinc-50 p-4" key={template.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black">{template.name}</p>
                    <p className="text-sm text-zinc-500">Trigger: {statusLabels[template.status]}</p>
                  </div>
                  <button
                    className={`h-9 rounded-xl px-3 text-sm font-semibold ${
                      template.enabled ? "bg-emerald-50 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                    }`}
                    onClick={() => updateTemplate(template.id, { enabled: !template.enabled })}
                  >
                    {template.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  <Field label="Subject">
                    <input className="ui-input bg-white" value={template.subject} onChange={(event) => updateTemplate(template.id, { subject: event.target.value })} />
                  </Field>
                  <Field label="Body">
                    <textarea className="ui-textarea bg-white" value={template.body} onChange={(event) => updateTemplate(template.id, { body: event.target.value })} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black tracking-tight">Delivery log</h2>
          <p className="mt-1 text-sm text-zinc-500">Logs appear when candidate status changes or an application is submitted.</p>
          <div className="mt-5 space-y-3">
            {logs.map((log) => (
              <div className="rounded-2xl border border-zinc-100 p-4" key={log.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{log.applicantName}</p>
                  <Pill className={statusTone[log.status]}>{statusLabels[log.status]}</Pill>
                </div>
                <p className="mt-2 text-sm text-zinc-500">{log.templateName}</p>
                <p className="mt-1 text-xs font-semibold text-zinc-400">
                  {log.sentAt} - {log.deliveryStatus}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm text-violet-800">
        Active triggers: {notificationStatuses.map((status) => statusLabels[status]).join(", ")}.
      </div>
    </ModulePage>
  );
}

function ApplicantDetailModule({
  applicant,
  approveParsedData,
  scores,
  setScreen,
  threshold,
  updateApplicant,
  updateApplicantStatus,
}: {
  applicant: Applicant;
  approveParsedData: (id: string) => void;
  scores: Applicant["scores"];
  setScreen: (screen: Screen) => void;
  threshold: number;
  updateApplicant: (id: string, update: Partial<Applicant>) => void;
  updateApplicantStatus: (id: string, status: ApplicationStatus) => void;
}) {
  const [experienceYears, setExperienceYears] = useState(applicant.parsedProfile.experienceYears);
  const [education, setEducation] = useState(applicant.parsedProfile.education);
  const [note, setNote] = useState(applicant.reviewerNote);
  const score = totalScore(scores);

  const saveCorrections = () => {
    updateApplicant(applicant.id, {
      reviewerNote: note,
      parsedProfile: {
        ...applicant.parsedProfile,
        education,
        experienceYears,
      },
    });
  };

  return (
    <section className="bg-[#fbfbfd] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <button className="text-sm font-semibold text-violet-700" onClick={() => setScreen("reporting")}>
          Back to dashboard
        </button>
        <div className="mt-4 grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-black tracking-tight">{applicant.name}</h1>
                    <Pill className={statusTone[applicant.status]}>{statusLabels[applicant.status]}</Pill>
                    <Pill className={parserTone[applicant.parsedProfile.parsingStatus]}>
                      {parsingLabels[applicant.parsedProfile.parsingStatus]}
                    </Pill>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">
                    {applicant.id} - {applicant.cvFileName} - Applied {applicant.appliedAt}
                  </p>
                </div>
                <div className="rounded-2xl bg-violet-50 px-5 py-3 text-center">
                  <p className={`text-3xl font-black ${scoreClass(score)}`}>{score}%</p>
                  <p className="text-xs font-semibold text-zinc-500">Match score</p>
                </div>
              </div>

              {applicant.parsedProfile.missingFields.length > 0 && (
                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">Needs manual correction</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {applicant.parsedProfile.missingFields.map((field) => (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700" key={field}>
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Experience years">
                  <input className="ui-input" min="0" onChange={(event) => setExperienceYears(Number(event.target.value))} type="number" value={experienceYears} />
                </Field>
                <Field label="Education">
                  <input className="ui-input" onChange={(event) => setEducation(event.target.value)} value={education} />
                </Field>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-zinc-950">Extracted skills</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {applicant.parsedProfile.skills.map((skill) => (
                    <span className="rounded-full bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-700" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black tracking-tight">Reviewer notes</h2>
              <textarea className="ui-textarea mt-4" onChange={(event) => setNote(event.target.value)} value={note} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-semibold" onClick={saveCorrections}>
                  Save corrections
                </button>
                <button className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white" onClick={() => approveParsedData(applicant.id)}>
                  Approve parsed data
                </button>
                <button className="h-10 rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700" onClick={() => updateApplicantStatus(applicant.id, "shortlisted")}>
                  Shortlist
                </button>
                <button className="h-10 rounded-xl bg-cyan-50 px-4 text-sm font-semibold text-cyan-700" onClick={() => updateApplicantStatus(applicant.id, "interview")}>
                  Interview
                </button>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black tracking-tight">Scoring breakdown</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Threshold {threshold}. Candidate is {score >= threshold ? "above" : "below"} the active focus line.
              </p>
              <div className="mt-5 space-y-4">
                {scores.map((criterion) => (
                  <div key={criterion.id}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {criterion.label} {formatWeight(criterion.weight)}
                      </p>
                      <p className="text-sm font-black">{Math.round(criterion.weightedScore)}</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-zinc-100">
                      <div className="h-2 rounded-full bg-violet-600" style={{ width: `${criterion.rawScore}%` }} />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{criterion.notes}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black tracking-tight">Original upload</h2>
              <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                <p className="font-semibold">{applicant.cvFileName}</p>
                <p className="mt-1 text-sm text-zinc-500">Mock file reference. No storage integration in v1.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

function CandidateCard({
  applicant,
  rank,
  selectApplicant,
  updateApplicantStatus,
}: {
  applicant: Applicant;
  rank: number;
  selectApplicant: (id: string) => void;
  updateApplicantStatus: (id: string, status: ApplicationStatus) => void;
}) {
  const score = totalScore(applicant.scores);
  const initials = applicant.name
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2);

  return (
    <article className="rounded-[22px] border border-zinc-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-50 text-sm font-black text-zinc-500">
            #{rank}
          </div>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-zinc-100 text-sm font-black text-zinc-600">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="text-left text-lg font-black tracking-tight text-zinc-950 hover:text-violet-700"
                onClick={() => selectApplicant(applicant.id)}
              >
                {applicant.name}
              </button>
              <Pill className={statusTone[applicant.status]}>{statusLabels[applicant.status]}</Pill>
            </div>
            <p className="mt-1 text-sm text-zinc-600">{applicant.email}</p>
            <p className="mt-2 text-sm text-zinc-500">
              {applicant.location} - {applicant.parsedProfile.experienceYears} years - {applicant.source}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {applicant.parsedProfile.skills.slice(0, 4).map((skill) => (
                <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 xl:items-end">
          <Pill className={parserTone[applicant.parsedProfile.parsingStatus]}>
            {parsingLabels[applicant.parsedProfile.parsingStatus]}
          </Pill>
          <p className="text-sm text-zinc-500">
            Match score: <span className={`text-base font-black ${scoreClass(score)}`}>{score}%</span>
          </p>
          <select
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400"
            value={applicant.status}
            onChange={(event) => updateApplicantStatus(applicant.id, event.target.value as ApplicationStatus)}
          >
            {applicationStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="w-fit text-sm font-semibold text-zinc-700 underline-offset-4 hover:text-violet-700 hover:underline"
          onClick={() => selectApplicant(applicant.id)}
        >
          View profile
        </button>
        <div className="flex flex-wrap gap-2">
          <button className="h-9 rounded-xl bg-violet-50 px-3 text-sm font-semibold text-violet-700" onClick={() => updateApplicantStatus(applicant.id, "needs_review")}>
            Mark review
          </button>
          <button className="h-9 rounded-xl bg-emerald-50 px-3 text-sm font-semibold text-emerald-700" onClick={() => updateApplicantStatus(applicant.id, "shortlisted")}>
            Shortlist
          </button>
          <button className="h-9 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-600" onClick={() => updateApplicantStatus(applicant.id, "rejected")}>
            Reject
          </button>
        </div>
      </div>
    </article>
  );
}

function ScreeningFilters({
  applicants,
  query,
  setQuery,
  setStatusFilter,
  setThreshold,
  statusFilter,
  threshold,
}: {
  applicants: Applicant[];
  query: string;
  setQuery: (query: string) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setThreshold: (threshold: number) => void;
  statusFilter: StatusFilter;
  threshold: number;
}) {
  return (
    <aside className="bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Scoring filters</h2>
        <button className="text-sm font-semibold text-violet-700" onClick={() => setStatusFilter("all")}>
          Clear
        </button>
      </div>
      <div className="mt-7 space-y-8">
        <Field label="Search">
          <input className="ui-input" onChange={(event) => setQuery(event.target.value)} placeholder="Name, skill, source..." value={query} />
        </Field>
        <FilterGroup title="Status">
          <FilterCheck active={statusFilter === "all"} count={applicants.length} label="All" onClick={() => setStatusFilter("all")} />
          {applicationStatuses.map((status) => (
            <FilterCheck
              active={statusFilter === status}
              count={applicants.filter((applicant) => applicant.status === status).length}
              key={status}
              label={statusLabels[status]}
              onClick={() => setStatusFilter(status)}
            />
          ))}
        </FilterGroup>
        <ThresholdInput setThreshold={setThreshold} threshold={threshold} />
      </div>
    </aside>
  );
}

function ReportingFilters({
  applicants,
  parsingFilter,
  query,
  setParsingFilter,
  setQuery,
  setStatusFilter,
  setThreshold,
  statusFilter,
  threshold,
}: {
  applicants: Applicant[];
  parsingFilter: ParsingFilter;
  query: string;
  setParsingFilter: (status: ParsingFilter) => void;
  setQuery: (query: string) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setThreshold: (threshold: number) => void;
  statusFilter: StatusFilter;
  threshold: number;
}) {
  return (
    <aside className="bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Filters</h2>
        <button
          className="text-sm font-semibold text-violet-700"
          onClick={() => {
            setQuery("");
            setStatusFilter("all");
            setParsingFilter("all");
            setThreshold(75);
          }}
        >
          Clear all
        </button>
      </div>
      <div className="mt-7 space-y-8">
        <Field label="Search keywords">
          <input className="ui-input" onChange={(event) => setQuery(event.target.value)} placeholder="Name, skill, source..." value={query} />
        </Field>
        <FilterGroup title="Status">
          <FilterCheck active={statusFilter === "all"} count={applicants.length} label="All" onClick={() => setStatusFilter("all")} />
          {applicationStatuses.map((status) => (
            <FilterCheck
              active={statusFilter === status}
              count={applicants.filter((applicant) => applicant.status === status).length}
              key={status}
              label={statusLabels[status]}
              onClick={() => setStatusFilter(status)}
            />
          ))}
        </FilterGroup>
        <FilterGroup title="Parsing">
          <FilterCheck active={parsingFilter === "all"} count={applicants.length} label="All parser states" onClick={() => setParsingFilter("all")} />
          {parsingStatuses.map((status) => (
            <FilterCheck
              active={parsingFilter === status}
              count={applicants.filter((applicant) => applicant.parsedProfile.parsingStatus === status).length}
              key={status}
              label={parsingLabels[status]}
              onClick={() => setParsingFilter(status)}
            />
          ))}
        </FilterGroup>
        <ThresholdInput setThreshold={setThreshold} threshold={threshold} />
      </div>
    </aside>
  );
}

function AnalyticsPanel({ applicants }: { applicants: Applicant[] }) {
  const scoreBands = [
    { label: "85-100", count: applicants.filter((applicant) => totalScore(applicant.scores) >= 85).length },
    {
      label: "70-84",
      count: applicants.filter((applicant) => {
        const score = totalScore(applicant.scores);
        return score >= 70 && score < 85;
      }).length,
    },
    { label: "Below 70", count: applicants.filter((applicant) => totalScore(applicant.scores) < 70).length },
  ];
  const sourceCounts = applicants.reduce<Record<string, number>>((counts, applicant) => {
    counts[applicant.source] = (counts[applicant.source] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black tracking-tight">Analytics panel</h2>
      <div className="mt-5 space-y-4">
        {scoreBands.map((band) => (
          <div key={band.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{band.label}</span>
              <span className="font-black">{band.count}</span>
            </div>
            <div className="mt-2 h-3 rounded-full bg-zinc-100">
              <div className="h-3 rounded-full bg-violet-600" style={{ width: `${(band.count / Math.max(applicants.length, 1)) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {Object.entries(sourceCounts).map(([source, count]) => (
          <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-3 text-sm" key={source}>
            <span className="font-semibold">{source}</span>
            <span className="font-black">{count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExportPanel({
  applicants,
  exportReady,
  reportFilter,
  setExportReady,
  setReportFilter,
}: {
  applicants: Applicant[];
  exportReady: boolean;
  reportFilter: ReportFilter;
  setExportReady: (ready: boolean) => void;
  setReportFilter: (filter: ReportFilter) => void;
}) {
  return (
    <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black tracking-tight">Export preview</h2>
      <div className="mt-4 grid gap-3">
        <Field label="Date range">
          <select className="ui-input bg-white" value={reportFilter.dateRange} onChange={(event) => setReportFilter({ ...reportFilter, dateRange: event.target.value as ReportFilter["dateRange"] })}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </Field>
        <Field label={`Minimum score: ${reportFilter.minimumScore}`}>
          <input className="h-11 w-full accent-violet-600" max="95" min="40" onChange={(event) => setReportFilter({ ...reportFilter, minimumScore: Number(event.target.value) })} type="range" value={reportFilter.minimumScore} />
        </Field>
      </div>
      <div className="mt-4 space-y-2">
        {applicants
          .filter((applicant) => totalScore(applicant.scores) >= reportFilter.minimumScore)
          .slice(0, 4)
          .map((applicant) => (
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-3 text-sm" key={applicant.id}>
              <span className="font-semibold">{applicant.name}</span>
              <span className="font-black">{totalScore(applicant.scores)}%</span>
            </div>
          ))}
      </div>
      <button className="mt-4 h-10 w-full rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white" onClick={() => setExportReady(true)}>
        Export report
      </button>
      <p className={`mt-4 text-sm font-semibold ${exportReady ? "text-emerald-700" : "text-zinc-500"}`}>
        {exportReady ? "PDF and Excel export preview generated." : "No real file generated in frontend-only v1."}
      </p>
    </section>
  );
}

function ModulePage({
  action,
  children,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="bg-[#fbfbfd] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <ModuleHeader description={description} eyebrow={eyebrow} title={title} />
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

function ModuleHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-violet-700">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      {children}
    </div>
  );
}

function Pill({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function SubtleTag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{children}</span>;
}

function FilterGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div>
      <p className="mb-3 text-sm font-black">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FilterCheck({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left" onClick={onClick}>
      <span className="flex items-center gap-3">
        <span
          className={`grid h-5 w-5 place-items-center rounded-md border text-xs ${
            active ? "border-violet-500 bg-violet-500 text-white" : "border-zinc-200 bg-white"
          }`}
        >
          {active ? "x" : ""}
        </span>
        <span className={active ? "text-sm font-semibold text-zinc-950" : "text-sm text-zinc-600"}>{label}</span>
      </span>
      <span className="text-xs font-semibold text-zinc-500">{count}</span>
    </button>
  );
}

function ThresholdInput({
  setThreshold,
  threshold,
}: {
  setThreshold: (threshold: number) => void;
  threshold: number;
}) {
  return (
    <FilterGroup title="Score threshold">
      <div className="rounded-2xl bg-zinc-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Minimum focus score</span>
          <span className="text-sm font-black text-zinc-950">{threshold}</span>
        </div>
        <input className="mt-4 w-full accent-violet-600" max="95" min="40" onChange={(event) => setThreshold(Number(event.target.value))} type="range" value={threshold} />
      </div>
    </FilterGroup>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ProcessStep({ active = false, detail, title }: { active?: boolean; detail: string; title: string }) {
  return (
    <div className={`rounded-2xl p-4 ${active ? "bg-violet-50" : "bg-zinc-50"}`}>
      <p className={`text-sm font-black ${active ? "text-violet-700" : "text-zinc-600"}`}>{title}</p>
      <p className="mt-2 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}

function StepItem({ active = false, label }: { active?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-3 w-3 rounded-full ${active ? "bg-violet-400" : "bg-zinc-600"}`} />
      <span className={active ? "text-sm font-semibold text-white" : "text-sm text-zinc-400"}>{label}</span>
    </div>
  );
}
