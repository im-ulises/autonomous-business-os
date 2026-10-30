export type View = "now" | "companies" | "company" | "brand" | "software" | "departments" | "projects" | "missions" | "docs" | "workflows" | "results" | "systems";

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
};

export type SoftwarePhase = {
  id: string;
  title: string;
  description: string;
  status: SoftwarePhaseStatus;
  milestones: SoftwareMilestone[];
  notes: string;
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
};
