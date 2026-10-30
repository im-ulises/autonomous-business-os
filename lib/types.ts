export type View = "now" | "companies" | "company" | "departments" | "projects" | "missions" | "docs" | "workflows" | "results" | "systems";

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
