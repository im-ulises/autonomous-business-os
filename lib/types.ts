export type View = "now" | "companies" | "company" | "brand" | "software" | "departments" | "proposals" | "projects" | "missions" | "docs" | "workflows" | "results" | "systems";

export type Company = {
  id: string;
  name: string;
  short: string;
  description: string;
  accent: string;
  demo?: boolean;
};

export type Project = {
  id: string;
  companyId: string;
  name: string;
  description: string;
  stage: "idea" | "planning" | "active" | "waiting" | "completed";
  createdAt: string;
  demo?: boolean;
};

export type Mission = {
  id: string;
  companyId: string;
  projectId?: string;
  title: string;
  outcome: string;
  assignee: "claude" | "codex" | "grok" | "unassigned";
  status: "local_draft" | "planned";
  createdAt: string;
  demo?: boolean;
};

export type LocalDoc = {
  id: string;
  companyId: string;
  name: string;
  content: string;
  createdAt: string;
};

export type Store = {
  companies: Company[];
  projects: Project[];
  missions: Mission[];
  localDocs: LocalDoc[];
  clients: Client[];
  projectDetails: Record<string, ProjectDetails>;
  /** Brand guides for each company, including editable demo-company records. */
  companyBrandGuides: Record<string, BrandGuide>;
  softwareProjects: SoftwareProject[];
  departmentContexts: DepartmentContext[];
};

export type ProjectPriority = "low" | "normal" | "high" | "critical";

export type Client = {
  id: string;
  companyId: string;
  name: string;
  description: string;
  industry: string;
  brandColor: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  demo?: boolean;
  brandGuide?: BrandGuide;
};

export type ProjectTask = {
  id: string;
  title: string;
  done: boolean;
};

export type ProjectDetails = {
  priority?: ProjectPriority;
  stageOverride?: Project["stage"];
  clientId?: string;
  dueDate?: string;
  brief?: string;
  notes?: string;
  tasks?: ProjectTask[];
  updatedAt?: string;
};

/** Stored locally in the public demo; these fields are not an audit log. */
export type BrandColor = {
  id: string;
  name: string;
  role: "primary" | "secondary" | "accent" | "neutral" | "background";
  hex: string;
  pantone: string;
  cmyk: string;
  approved: boolean;
};

export type BrandLogo = {
  id: string;
  name: string;
  variant: "primary" | "horizontal" | "vertical" | "monochrome" | "inverse" | "icon" | "other";
  background: "light" | "dark" | "any";
  usage: string;
  url: string;
  dataUrl?: string;
  fileName?: string;
  approved: boolean;
};

export type BrandGuide = {
  colors: BrandColor[];
  logos: BrandLogo[];
  primaryFont: string;
  secondaryFont: string;
  toneOfVoice: string;
  dos: string;
  donts: string;
  notes: string;
  guidelineUrl: string;
  reviewedBy: string;
  reviewedAt?: string;
};

/** Separate long-running product/engineering portfolio, not marketing or web jobs. */
export type SoftwareProjectStatus = "planning" | "building" | "at_risk" | "paused" | "delivered";
export type SoftwarePhaseStatus = "pending" | "active" | "review" | "blocked" | "done";

export type SoftwareMilestone = {
  id: string;
  title: string;
  deliverable: string;
  dueDate: string;
  done: boolean;
  /** A checked code milestone may still differ from operational acceptance. */
  verification?: {
    level: "accepted" | "staging" | "implemented" | "pending";
    summary: string;
    url?: string;
  };
};

export type SoftwarePhase = {
  id: string;
  title: string;
  description: string;
  status: SoftwarePhaseStatus;
  milestones: SoftwareMilestone[];
  notes: string;
  /** Source document fields, not a statement of actual delivery progress. */
  window?: string;
  demo?: string;
  sourcePage?: number;
  acceptanceCriteria?: string[];
};

export type SoftwareProject = {
  id: string;
  companyId: string;
  name: string;
  description: string;
  clientId: string;
  owner: string;
  stack: string;
  repoUrl: string;
  specUrl: string;
  startDate: string;
  targetDate: string;
  status: SoftwareProjectStatus;
  phases: SoftwarePhase[];
  nextAction: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  sourceName?: string;
  sourceVersion?: string;
  commercialWindow?: string;
  repositoryReview?: {
    version: string;
    reviewedAt: string;
    repositoryBranch: string;
    repositoryCommit: string;
    stagingUrl: string;
    apiDeployment: string;
    webDeployment: string;
    summary: string;
    blockers: string[];
    findings: string[];
  };
};

/** The company department owns context, not the reusable agent's identity or permissions. */
export type DepartmentObjective = {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  status: "active" | "paused" | "achieved";
};

export type DepartmentKpi = {
  id: string;
  name: string;
  target: string;
  unit: string;
  cadence: string;
  measurementSource: string;
};

export type DepartmentLesson = {
  id: string;
  category: "worked" | "failed" | "insight" | "decision";
  title: string;
  situation: string;
  outcome: string;
  learning: string;
  evidenceUrl: string;
  observedAt: string;
  status: "draft" | "approved" | "rejected";
  reviewedBy: string;
};

export type DepartmentContext = {
  id: string;
  companyId: string;
  name: string;
  purpose: string;
  agentRole: string;
  mission: string;
  successCriteria: string;
  toneOfVoice: string;
  workMode: string;
  operatingProcedure: string;
  constraints: string;
  escalationRules: string;
  expectedInputs: string;
  expectedOutputs: string;
  objectives: DepartmentObjective[];
  kpis: DepartmentKpi[];
  lessons: DepartmentLesson[];
  revision: number;
  updatedAt: string;
};
