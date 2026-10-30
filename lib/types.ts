export type View = "now" | "companies" | "departments" | "projects" | "missions" | "docs" | "workflows" | "results" | "systems";

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
};
