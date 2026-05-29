"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  activeJobPosting,
  initialApplicants,
  initialReportFilter,
  scoreApplicants,
  totalScore,
} from "./mockData";
import type { Applicant, ApplicationStatus, ParsingStatus, ReportFilter } from "./types";

type View = "apply" | "confirmation" | "login" | "dashboard" | "detail" | "analytics";
type StatusFilter = "all" | ApplicationStatus;
type ParsingFilter = "all" | ParsingStatus;

const statusLabels: Record<ApplicationStatus, string> = {
  new: "New",
  screening: "Screening",
  needs_review: "Needs review",
  shortlisted: "Shortlisted",
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
  rejected: "bg-zinc-100 text-zinc-600",
};

const parserTone: Record<ParsingStatus, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  parsed: "bg-emerald-50 text-emerald-700",
  needs_review: "bg-amber-50 text-amber-700",
  failed: "bg-rose-50 text-rose-700",
};

const applicationStatuses: ApplicationStatus[] = [
  "new",
  "screening",
  "needs_review",
  "shortlisted",
  "rejected",
];
const parsingStatuses: ParsingStatus[] = ["pending", "parsed", "needs_review", "failed"];

const scoreClass = (score: number) => {
  if (score >= 85) return "text-emerald-700";
  if (score >= 70) return "text-violet-700";
  return "text-rose-700";
};

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [applicants, setApplicants] = useState<Applicant[]>(initialApplicants);
  const [selectedApplicantId, setSelectedApplicantId] = useState(initialApplicants[0].id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [parsingFilter, setParsingFilter] = useState<ParsingFilter>("all");
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState(75);
  const [reportFilter, setReportFilter] = useState<ReportFilter>(initialReportFilter);
  const [submittedName, setSubmittedName] = useState("Jordan Cruz");
  const [exportReady, setExportReady] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  const rankedApplicants = useMemo(
    () =>
      [...applicants].sort((a, b) => {
        const scoreDifference = totalScore(b.scores) - totalScore(a.scores);
        return scoreDifference || a.appliedAt.localeCompare(b.appliedAt);
      }),
    [applicants],
  );

  const selectedApplicant =
    applicants.find((applicant) => applicant.id === selectedApplicantId) ?? rankedApplicants[0];

  const filteredApplicants = rankedApplicants.filter((applicant) => {
    const text = `${applicant.name} ${applicant.email} ${applicant.source} ${applicant.parsedProfile.skills.join(" ")}`;
    return (
      (statusFilter === "all" || applicant.status === statusFilter) &&
      (parsingFilter === "all" || applicant.parsedProfile.parsingStatus === parsingFilter) &&
      totalScore(applicant.scores) >= threshold - 25 &&
      text.toLowerCase().includes(query.toLowerCase())
    );
  });

  const metrics = useMemo(() => {
    const averageScore = Math.round(
      applicants.reduce((sum, applicant) => sum + totalScore(applicant.scores), 0) / applicants.length,
    );
    return {
      averageScore,
      reviewed: applicants.filter((applicant) => applicant.parsedProfile.parsingStatus === "parsed").length,
      reviewQueue: applicants.filter(
        (applicant) =>
          applicant.status === "needs_review" || applicant.parsedProfile.parsingStatus === "needs_review",
      ).length,
      shortlisted: applicants.filter((applicant) => applicant.status === "shortlisted").length,
    };
  }, [applicants]);

  const updateApplicant = (id: string, update: Partial<Applicant>) => {
    setApplicants((current) =>
      current.map((applicant) => (applicant.id === id ? { ...applicant, ...update } : applicant)),
    );
  };

  const handleSubmitApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const newApplicant: Applicant = {
      id: `AM-${1041 + applicants.length}`,
      name: submittedName || "New Applicant",
      email: "candidate@example.com",
      phone: "+63 900 111 2222",
      location: "Metro Manila",
      source: "Careers page",
      appliedAt: "2026-05-30",
      jobId: activeJobPosting.id,
      cvFileName: "Candidate_CV.pdf",
      status: "screening",
      parsedProfile: {
        parsingStatus: "pending",
        parserConfidence: 0,
        skills: ["Vehicle diagnostics", "Customer handoff"],
        experienceYears: 3,
        education: "Technical automotive diploma",
        certifications: ["Automotive Service NC II"],
        workHistory: [{ company: "Applicant provided", role: "Automotive technician", dates: "2023-2026" }],
        missingFields: ["Parser run pending", "Work history validation"],
      },
      scores: scoreApplicants({ skills: 74, experience: 66, education: 72, certifications: 70 }),
      reviewerNote: "New portal submission. Parser state is simulated as pending.",
    };

    setApplicants((current) => [newApplicant, ...current]);
    setSelectedApplicantId(newApplicant.id);
    setView("confirmation");
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginMessage("Demo access granted. Real authentication is out of scope for Phase 1.");
    setView("dashboard");
  };

  return (
    <main className="min-h-screen bg-[#f8f8fb] text-zinc-950">
      <AppShell view={view} setView={setView}>
        {view === "apply" && (
          <ApplicationForm
            submittedName={submittedName}
            setSubmittedName={setSubmittedName}
            onSubmit={handleSubmitApplication}
          />
        )}

        {view === "confirmation" && (
          <ConfirmationScreen applicant={selectedApplicant} submittedName={submittedName} setView={setView} />
        )}

        {view === "login" && <LoginScreen loginMessage={loginMessage} onSubmit={handleLogin} />}

        {view === "dashboard" && (
          <DashboardScreen
            applicants={filteredApplicants}
            allApplicants={applicants}
            metrics={metrics}
            parsingFilter={parsingFilter}
            query={query}
            setParsingFilter={setParsingFilter}
            setQuery={setQuery}
            setStatusFilter={setStatusFilter}
            setThreshold={setThreshold}
            statusFilter={statusFilter}
            threshold={threshold}
            selectApplicant={(id) => {
              setSelectedApplicantId(id);
              setView("detail");
            }}
            setView={setView}
            updateApplicant={updateApplicant}
          />
        )}

        {view === "detail" && selectedApplicant && (
          <ApplicantDetailScreen
            applicant={selectedApplicant}
            setView={setView}
            threshold={threshold}
            updateApplicant={updateApplicant}
          />
        )}

        {view === "analytics" && (
          <AnalyticsScreen
            applicants={rankedApplicants}
            exportReady={exportReady}
            reportFilter={reportFilter}
            setExportReady={setExportReady}
            setReportFilter={setReportFilter}
            setView={setView}
          />
        )}
      </AppShell>
    </main>
  );
}

function AppShell({
  children,
  view,
  setView,
}: {
  children: ReactNode;
  view: View;
  setView: (view: View) => void;
}) {
  const navItems: { label: string; view: View }[] = [
    { label: "Dashboard", view: "dashboard" },
    { label: "Candidates", view: "dashboard" },
    { label: "Apply", view: "apply" },
    { label: "Analytics", view: "analytics" },
    { label: "Login", view: "login" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[1440px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/95 backdrop-blur">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open dashboard"
              className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-sm font-black text-white"
              onClick={() => setView("dashboard")}
            >
              A
            </button>
            <div>
              <p className="text-xl font-black tracking-tight">AutoHire</p>
              <p className="text-xs text-zinc-500">Application screening system</p>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-zinc-50 p-1">
            {navItems.map((item) => {
              const active = item.view === view || (item.label === "Candidates" && view === "detail");
              return (
                <button
                  className={`h-10 shrink-0 rounded-xl px-4 text-sm font-medium transition ${
                    active ? "bg-white text-violet-700 shadow-sm" : "text-zinc-600 hover:bg-white hover:text-zinc-950"
                  }`}
                  key={item.label}
                  onClick={() => setView(item.view)}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              className="h-10 shrink-0 rounded-xl px-4 text-sm font-medium text-zinc-400"
              disabled
            >
              Jobs
            </button>
          </nav>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              /
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              ?
            </button>
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 px-3 py-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-sm font-black text-violet-700">
                HR
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold">Hiring Team</p>
                <p className="text-xs text-zinc-500">Reviewer</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function DashboardScreen({
  applicants,
  allApplicants,
  metrics,
  parsingFilter,
  query,
  setParsingFilter,
  setQuery,
  setStatusFilter,
  setThreshold,
  statusFilter,
  threshold,
  selectApplicant,
  setView,
  updateApplicant,
}: {
  applicants: Applicant[];
  allApplicants: Applicant[];
  metrics: { averageScore: number; reviewed: number; reviewQueue: number; shortlisted: number };
  parsingFilter: ParsingFilter;
  query: string;
  setParsingFilter: (status: ParsingFilter) => void;
  setQuery: (query: string) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setThreshold: (threshold: number) => void;
  statusFilter: StatusFilter;
  threshold: number;
  selectApplicant: (id: string) => void;
  setView: (view: View) => void;
  updateApplicant: (id: string, update: Partial<Applicant>) => void;
}) {
  return (
    <section className="grid min-h-[calc(100vh-82px)] lg:grid-cols-[280px_1fr]">
      <FilterRail
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
        <div className="rounded-[22px] border border-zinc-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Candidates</h1>
              <p className="mt-1 text-sm text-zinc-500">Manage parsing, scoring, and review decisions in one queue.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                onClick={() => setView("analytics")}
              >
                Export report
              </button>
              <button
                className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
                onClick={() => setView("apply")}
              >
                Add candidate
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Candidates" value={allApplicants.length.toString()} />
            <MetricTile label="Avg. score" value={`${metrics.averageScore}%`} />
            <MetricTile label="Reviewed" value={metrics.reviewed.toString()} />
            <MetricTile label="Shortlisted" value={metrics.shortlisted.toString()} />
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <SubtleTag>{applicants.length} visible</SubtleTag>
              <SubtleTag>Threshold {threshold}</SubtleTag>
              {statusFilter !== "all" && <SubtleTag>Status: {statusLabels[statusFilter]}</SubtleTag>}
              {parsingFilter !== "all" && <SubtleTag>Parser: {parsingLabels[parsingFilter]}</SubtleTag>}
            </div>
            <div className="flex gap-2">
              <select className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-violet-400">
                <option>Sort by score</option>
                <option>Sort by recent</option>
                <option>Sort by parser state</option>
              </select>
              <button className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700">::</button>
              <button className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 text-zinc-600">=</button>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {applicants.map((applicant) => (
            <CandidateCard
              applicant={applicant}
              key={applicant.id}
              selectApplicant={selectApplicant}
              updateApplicant={updateApplicant}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FilterRail({
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
          <input
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, skill, source..."
            value={query}
          />
        </Field>

        <FilterGroup title="Status">
          <FilterCheck
            active={statusFilter === "all"}
            count={applicants.length}
            label="All"
            onClick={() => setStatusFilter("all")}
          />
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
          <FilterCheck
            active={parsingFilter === "all"}
            count={applicants.length}
            label="All parser states"
            onClick={() => setParsingFilter("all")}
          />
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

        <FilterGroup title="Score threshold">
          <div className="rounded-2xl bg-zinc-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Minimum focus score</span>
              <span className="text-sm font-black text-zinc-950">{threshold}</span>
            </div>
            <input
              className="mt-4 w-full accent-violet-600"
              max="95"
              min="40"
              onChange={(event) => setThreshold(Number(event.target.value))}
              type="range"
              value={threshold}
            />
          </div>
        </FilterGroup>
      </div>
    </aside>
  );
}

function CandidateCard({
  applicant,
  selectApplicant,
  updateApplicant,
}: {
  applicant: Applicant;
  selectApplicant: (id: string) => void;
  updateApplicant: (id: string, update: Partial<Applicant>) => void;
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
          <button
            className="mt-1 h-5 w-5 shrink-0 rounded-md border border-zinc-200 bg-white"
            aria-label={`Select ${applicant.name}`}
          />
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
              <button className="text-zinc-300" aria-label={`Favorite ${applicant.name}`}>
                *
              </button>
            </div>
            <p className="mt-1 text-sm text-zinc-600">{activeJobPosting.title}</p>
            <p className="mt-2 text-sm text-zinc-500">
              {applicant.location} - {applicant.parsedProfile.experienceYears} years experience -{" "}
              {applicant.parsedProfile.education}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {applicant.parsedProfile.skills.slice(0, 4).map((skill) => (
                <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700" key={skill}>
                  {skill}
                </span>
              ))}
              {applicant.parsedProfile.skills.length > 4 && (
                <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-500">
                  +{applicant.parsedProfile.skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 xl:items-end">
          <div className="flex items-center gap-3">
            <Pill className={parserTone[applicant.parsedProfile.parsingStatus]}>
              {parsingLabels[applicant.parsedProfile.parsingStatus]}
            </Pill>
            <button className="text-zinc-400" aria-label={`More actions for ${applicant.name}`}>
              ...
            </button>
          </div>
          <p className="text-sm text-zinc-500">
            Applied: <span className="font-semibold text-zinc-950">{applicant.appliedAt}</span>
          </p>
          <p className="text-sm text-zinc-500">
            Match score: <span className={`text-base font-black ${scoreClass(score)}`}>{score}%</span>
          </p>
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
          <button
            className="h-9 rounded-xl bg-violet-50 px-3 text-sm font-semibold text-violet-700 hover:bg-violet-100"
            onClick={() => updateApplicant(applicant.id, { status: "needs_review" })}
          >
            Mark review
          </button>
          <button
            className="h-9 rounded-xl bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            onClick={() => updateApplicant(applicant.id, { status: "shortlisted" })}
          >
            Shortlist
          </button>
          <button
            className="h-9 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
            onClick={() => updateApplicant(applicant.id, { status: "rejected" })}
          >
            Reject
          </button>
        </div>
      </div>
    </article>
  );
}

function ApplicationForm({
  onSubmit,
  setSubmittedName,
  submittedName,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setSubmittedName: (name: string) => void;
  submittedName: string;
}) {
  return (
    <section className="bg-[#fbfbfd] p-4 sm:p-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-[28px] bg-zinc-950 p-6 text-white">
          <p className="text-sm font-semibold text-violet-200">Candidate intake</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">A calmer application flow.</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            The applicant side is kept focused: submit personal details, upload a CV, answer only the screening
            questions needed for Phase 1, then move to status tracking.
          </p>
          <div className="mt-8 space-y-3">
            <StepItem active label="Applicant details" />
            <StepItem active label="CV upload" />
            <StepItem label="Parsing status" />
            <StepItem label="HR review" />
          </div>
        </aside>

        <form className="rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm sm:p-7" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-700">Open role</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">{activeJobPosting.title}</h2>
              <p className="mt-1 text-sm text-zinc-500">{activeJobPosting.location}</p>
            </div>
            <Pill className="bg-violet-50 text-violet-700">Phase 1 only</Pill>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input className="ui-input" onChange={(event) => setSubmittedName(event.target.value)} value={submittedName} />
            </Field>
            <Field label="Email">
              <input className="ui-input" defaultValue="candidate@example.com" type="email" />
            </Field>
            <Field label="Phone">
              <input className="ui-input" defaultValue="+63 900 111 2222" />
            </Field>
            <Field label="Location">
              <input className="ui-input" defaultValue="Metro Manila" />
            </Field>
            <Field label="Highest education">
              <select className="ui-input bg-white">
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
                <p className="mt-1 text-sm text-zinc-500">The parser state will be simulated after submission.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SubtleTag>PDF ready</SubtleTag>
                  <SubtleTag>Parser pending</SubtleTag>
                </div>
              </div>
            </Field>
            <Field label="Skills">
              <div className="flex min-h-36 flex-wrap content-start gap-2 rounded-2xl border border-zinc-200 p-3">
                {activeJobPosting.requiredSkills.map((skill) => (
                  <label className="flex items-center gap-2 rounded-full bg-zinc-50 px-3 py-2 text-sm" key={skill}>
                    <input className="accent-violet-600" defaultChecked type="checkbox" />
                    {skill}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Recent work history">
              <textarea
                className="ui-textarea"
                defaultValue="Automotive technician, 2023-2026. Supported diagnostics, preventive maintenance, and customer release checks."
              />
            </Field>
            <Field label="Supplementary questions">
              <textarea
                className="ui-textarea"
                defaultValue="Available for weekend operations. Comfortable with safety briefings and fast turnaround tasks."
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">Creates a local mock record for review.</p>
            <button className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700">
              Submit application
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ConfirmationScreen({
  applicant,
  setView,
  submittedName,
}: {
  applicant: Applicant;
  setView: (view: View) => void;
  submittedName: string;
}) {
  return (
    <section className="bg-[#fbfbfd] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm sm:p-8">
        <Pill className="bg-emerald-50 text-emerald-700">Submission received</Pill>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Thanks, {submittedName || "candidate"}.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Your application is now in the screening queue. This screen keeps the status simple while the parser and HR
          review states update in the prototype.
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-4">
          <ProcessStep active detail="Application record created" title="Submitted" />
          <ProcessStep active detail={parsingLabels[applicant.parsedProfile.parsingStatus]} title="CV parsing" />
          <ProcessStep detail="Ranking queue" title="HR review" />
          <ProcessStep detail="Shortlist or reject" title="Decision" />
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <InfoTile label="Application ID" value={applicant.id} />
          <InfoTile label="Upload" value={applicant.cvFileName} />
          <InfoTile label="Status" value={statusLabels[applicant.status]} />
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white" onClick={() => setView("dashboard")}>
            Open dashboard
          </button>
          <button className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-semibold" onClick={() => setView("login")}>
            Continue to login
          </button>
        </div>
      </div>
    </section>
  );
}

function LoginScreen({
  loginMessage,
  onSubmit,
}: {
  loginMessage: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="grid min-h-[calc(100vh-82px)] place-items-center bg-[#fbfbfd] p-4 sm:p-6">
      <form className="w-full max-w-md rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm" onSubmit={onSubmit}>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 font-black text-violet-700">
          HR
        </div>
        <h1 className="mt-5 text-center text-2xl font-black tracking-tight">Sign in to screening</h1>
        <p className="mt-2 text-center text-sm text-zinc-500">Mock access only. No real authentication in this v1.</p>
        <div className="mt-6 space-y-4">
          <Field label="Work email">
            <input className="ui-input" defaultValue="hr@example.com" type="email" />
          </Field>
          <Field label="Password">
            <input className="ui-input" defaultValue="automotion-demo" type="password" />
          </Field>
        </div>
        <button className="mt-6 h-11 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700">
          Sign in
        </button>
        {loginMessage && <p className="mt-4 text-center text-sm font-semibold text-emerald-700">{loginMessage}</p>}
      </form>
    </section>
  );
}

function ApplicantDetailScreen({
  applicant,
  setView,
  threshold,
  updateApplicant,
}: {
  applicant: Applicant;
  setView: (view: View) => void;
  threshold: number;
  updateApplicant: (id: string, update: Partial<Applicant>) => void;
}) {
  const score = totalScore(applicant.scores);
  const [experienceYears, setExperienceYears] = useState(applicant.parsedProfile.experienceYears);
  const [education, setEducation] = useState(applicant.parsedProfile.education);
  const [note, setNote] = useState(applicant.reviewerNote);

  const approveParsedData = () => {
    updateApplicant(applicant.id, {
      reviewerNote: note,
      status: "screening",
      parsedProfile: {
        ...applicant.parsedProfile,
        education,
        experienceYears,
        missingFields: [],
        parserConfidence: Math.max(applicant.parsedProfile.parserConfidence, 88),
        parsingStatus: "parsed",
      },
    });
  };

  return (
    <section className="bg-[#fbfbfd] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <button className="text-sm font-semibold text-violet-700" onClick={() => setView("dashboard")}>
          Back to candidates
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
                  <input
                    className="ui-input"
                    min="0"
                    onChange={(event) => setExperienceYears(Number(event.target.value))}
                    type="number"
                    value={experienceYears}
                  />
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
              <h2 className="text-xl font-black tracking-tight">Work history</h2>
              <div className="mt-4 divide-y divide-zinc-100 rounded-2xl border border-zinc-100">
                {applicant.parsedProfile.workHistory.map((work) => (
                  <div className="grid gap-1 p-4 md:grid-cols-[1fr_1fr_120px]" key={`${work.company}-${work.role}`}>
                    <p className="font-semibold">{work.company}</p>
                    <p className="text-sm text-zinc-600">{work.role}</p>
                    <p className="text-sm text-zinc-500">{work.dates}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black tracking-tight">Reviewer notes</h2>
              <textarea className="ui-textarea mt-4" onChange={(event) => setNote(event.target.value)} value={note} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white" onClick={approveParsedData}>
                  Approve parsed data
                </button>
                <button
                  className="h-10 rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700"
                  onClick={() => updateApplicant(applicant.id, { reviewerNote: note, status: "shortlisted" })}
                >
                  Shortlist
                </button>
                <button
                  className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600"
                  onClick={() => updateApplicant(applicant.id, { reviewerNote: note, status: "rejected" })}
                >
                  Reject
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
                {applicant.scores.map((criterion) => (
                  <div key={criterion.id}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {criterion.label} {Math.round(criterion.weight * 100)}%
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

function AnalyticsScreen({
  applicants,
  exportReady,
  reportFilter,
  setExportReady,
  setReportFilter,
  setView,
}: {
  applicants: Applicant[];
  exportReady: boolean;
  reportFilter: ReportFilter;
  setExportReady: (ready: boolean) => void;
  setReportFilter: (filter: ReportFilter) => void;
  setView: (view: View) => void;
}) {
  const sourceCounts = applicants.reduce<Record<string, number>>((counts, applicant) => {
    counts[applicant.source] = (counts[applicant.source] ?? 0) + 1;
    return counts;
  }, {});
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

  return (
    <section className="bg-[#fbfbfd] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
            <p className="mt-1 text-sm text-zinc-500">Report preview for screening volume, score bands, and sources.</p>
          </div>
          <button className="h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold" onClick={() => setView("dashboard")}>
            Back to candidates
          </button>
        </div>

        <div className="mt-6 rounded-[28px] border border-zinc-100 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Date range">
              <select
                className="ui-input bg-white"
                onChange={(event) =>
                  setReportFilter({ ...reportFilter, dateRange: event.target.value as ReportFilter["dateRange"] })
                }
                value={reportFilter.dateRange}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                className="ui-input bg-white"
                onChange={(event) =>
                  setReportFilter({ ...reportFilter, status: event.target.value as ReportFilter["status"] })
                }
                value={reportFilter.status}
              >
                <option value="all">All statuses</option>
                {applicationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Minimum score: ${reportFilter.minimumScore}`}>
              <input
                className="h-11 w-full accent-violet-600"
                max="95"
                min="40"
                onChange={(event) => setReportFilter({ ...reportFilter, minimumScore: Number(event.target.value) })}
                type="range"
                value={reportFilter.minimumScore}
              />
            </Field>
            <div className="flex items-end gap-2">
              <button
                className="h-11 flex-1 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white"
                onClick={() => setExportReady(true)}
              >
                Export
              </button>
              <button
                aria-label="Clear export preview"
                className="h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold"
                onClick={() => setExportReady(false)}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <ChartPanel title="Applicant volume">
            <div className="grid grid-cols-5 items-end gap-3">
              {applicants.map((applicant) => (
                <div className="text-center" key={applicant.id}>
                  <div
                    className="mx-auto w-full rounded-t-xl bg-violet-600"
                    style={{ height: `${Math.max(36, totalScore(applicant.scores)) * 1.35}px` }}
                    title={`${applicant.name}: ${totalScore(applicant.scores)}`}
                  />
                  <p className="mt-2 truncate text-xs font-semibold text-zinc-500">{applicant.id.slice(3)}</p>
                </div>
              ))}
            </div>
          </ChartPanel>

          <ChartPanel title="Score distribution">
            <div className="space-y-4">
              {scoreBands.map((band) => (
                <div key={band.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{band.label}</span>
                    <span className="font-black">{band.count}</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-zinc-100">
                    <div
                      className="h-3 rounded-full bg-violet-600"
                      style={{ width: `${(band.count / applicants.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ChartPanel>

          <ChartPanel title="Source breakdown">
            <div className="space-y-3">
              {Object.entries(sourceCounts).map(([source, count]) => (
                <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4" key={source}>
                  <span className="font-semibold">{source}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-black">{count}</span>
                </div>
              ))}
            </div>
          </ChartPanel>

          <ChartPanel title="Export preview">
            <p className="text-sm text-zinc-500">
              Filters: {reportFilter.dateRange}, {reportFilter.status}, minimum score {reportFilter.minimumScore}.
            </p>
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
            <p className={`mt-4 text-sm font-semibold ${exportReady ? "text-emerald-700" : "text-zinc-500"}`}>
              {exportReady ? "CSV and PDF report preview generated." : "Click export to simulate report generation."}
            </p>
          </ChartPanel>
        </div>
      </div>
    </section>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      {children}
    </label>
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

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
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

function ChartPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[28px] border border-zinc-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black tracking-tight">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
