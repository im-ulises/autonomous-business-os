/**
 * Typed opt-in adapter for the independent FastAPI service.
 *
 * This file is deliberately NOT wired into OperatingConsole until real OIDC
 * login and migration preview are verified. Never pass a service_role token
 * or DATABASE_URL to the browser.
 */
import type { Client, Company, Mission, Project } from "./types";

export type ApiCompany = {
  id: string; workspace_id: string; name: string; short: string;
  description: string; accent: string; created_at: string;
};
export type ApiClient = {
  id: string; company_id: string; name: string; notes: string;
  description: string; industry: string; brand_color: string;
  website: string; contact_name: string; contact_email: string;
  contact_phone: string; created_at: string;
};
export type ApiProject = {
  id: string; company_id: string; name: string; description: string;
  stage: Project["stage"]; created_at: string;
  priority: "low" | "normal" | "high" | "critical";
  due_date?: string | null; client_id?: string | null; updated_at: string;
};
export type ApiMission = {
  id: string; company_id: string; project_id?: string | null;
  title: string; outcome: string; assignee: Mission["assignee"];
  planning_state: Mission["status"];
  executor_hint: "unassigned" | "forge" | "crobi_marketing" | "human";
  status: "draft" | "approved" | "submitted" | "running" | "succeeded" | "failed";
  created_at: string;
};

export function companyFromApi(row: ApiCompany): Company {
  return {
    id: row.id, name: row.name, short: row.short,
    description: row.description, accent: row.accent,
  };
}
export function clientFromApi(row: ApiClient): Client {
  return {
    id: row.id, companyId: row.company_id, name: row.name,
    description: row.description, industry: row.industry,
    brandColor: row.brand_color, website: row.website,
    contactName: row.contact_name, contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
  };
}
export function projectFromApi(row: ApiProject): Project {
  return {
    id: row.id, companyId: row.company_id, name: row.name,
    description: row.description, stage: row.stage, createdAt: row.created_at,
  };
}
export function missionFromApi(row: ApiMission): Mission {
  return {
    id: row.id, companyId: row.company_id,
    projectId: row.project_id ?? undefined,
    title: row.title, outcome: row.outcome, assignee: row.assignee,
    status: row.planning_state, createdAt: row.created_at,
  };
}

export type ApiWorkspaceMember = {
  workspace_id: string;
  subject: string;
  role: "owner" | "editor" | "viewer";
};
export type ApiProjectMember = {
  project_id: string;
  subject: string;
  role: "editor" | "viewer";
  granted_by: string;
  created_at: string;
};

export type TokenProvider = () => Promise<string>;

export class AutonomousApiClient {
  private base: URL;
  private tokenProvider: TokenProvider;

  constructor(baseUrl: string, tokenProvider: TokenProvider) {
    const base = new URL(baseUrl);
    if (base.protocol !== "https:" &&
      !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) {
      throw new Error("Business OS API must use HTTPS outside localhost");
    }
    this.base = base;
    this.tokenProvider = tokenProvider;
  }

  private async request<T>(relativePath: string, method = "GET", payload?: unknown): Promise<T> {
    const token = await this.tokenProvider();
    if (!token) throw new Error("User access token required");
    const url = new URL(relativePath.replace(/^\//, ""), this.base.href.replace(/\/?$/, "/"));
    if (url.origin !== this.base.origin) throw new Error("Cross-origin API URL rejected");

    const result = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(payload === undefined ? {} : {"Content-Type": "application/json"}),
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    });
    if (!result.ok) throw new Error("Business OS API responded " + result.status);
    if (result.status === 204) return undefined as T;
    return result.json() as Promise<T>;
  }

  listWorkspaces() {
    return this.request<Array<{id:string; name:string; role:string}>>("v1/workspaces");
  }

  listWorkspaceMembers(workspaceId: string) {
    return this.request<ApiWorkspaceMember[]>("v1/workspaces/" + encodeURIComponent(workspaceId) + "/members");
  }
  addWorkspaceMember(workspaceId: string, subject: string, role: "editor" | "viewer") {
    return this.request<ApiWorkspaceMember>("v1/workspaces/" + encodeURIComponent(workspaceId) + "/members",
      "POST", {subject, role});
  }
  removeWorkspaceMember(workspaceId: string, subject: string) {
    return this.request<void>("v1/workspaces/" + encodeURIComponent(workspaceId) + "/members/" + encodeURIComponent(subject), "DELETE");
  }
  listSharedProjects(workspaceId: string) {
    return this.request<ApiProject[]>("v1/workspaces/" + encodeURIComponent(workspaceId) + "/shared-projects");
  }
  listProjectMembers(workspaceId: string, projectId: string) {
    return this.request<ApiProjectMember[]>("v1/workspaces/" + encodeURIComponent(workspaceId) +
      "/projects/" + encodeURIComponent(projectId) + "/members");
  }
  shareProject(workspaceId: string, projectId: string, subject: string, role: "editor" | "viewer") {
    return this.request<ApiProjectMember>("v1/workspaces/" + encodeURIComponent(workspaceId) +
      "/projects/" + encodeURIComponent(projectId) + "/members", "POST", {subject, role});
  }
  unshareProject(workspaceId: string, projectId: string, subject: string) {
    return this.request<void>("v1/workspaces/" + encodeURIComponent(workspaceId) +
      "/projects/" + encodeURIComponent(projectId) + "/members/" + encodeURIComponent(subject), "DELETE");
  }
  listCompanies(workspaceId: string) {
    return this.request<ApiCompany[]>("v1/workspaces/" + encodeURIComponent(workspaceId) + "/companies");
  }
  listClients(workspaceId: string, companyId: string) {
    return this.request<ApiClient[]>("v1/workspaces/" + encodeURIComponent(workspaceId) + "/clients?company_id=" + encodeURIComponent(companyId));
  }
  listProjects(workspaceId: string, companyId: string) {
    return this.request<ApiProject[]>("v1/workspaces/" + encodeURIComponent(workspaceId) + "/projects?company_id=" + encodeURIComponent(companyId));
  }
  listMissions(workspaceId: string, companyId: string) {
    return this.request<ApiMission[]>("v1/workspaces/" + encodeURIComponent(workspaceId) + "/missions?company_id=" + encodeURIComponent(companyId));
  }
  listSoftwareProducts(workspaceId: string, companyId: string) {
    return this.request<unknown[]>("v1/workspaces/" + encodeURIComponent(workspaceId) + "/software-products?company_id=" + encodeURIComponent(companyId));
  }
  listQuotes(workspaceId: string, companyId: string) {
    return this.request<unknown[]>("v1/workspaces/" + encodeURIComponent(workspaceId) + "/quotes?company_id=" + encodeURIComponent(companyId));
  }
}
