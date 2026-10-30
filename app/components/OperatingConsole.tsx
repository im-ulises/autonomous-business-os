"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Activity,
  BookOpen,
  Bot,
  Building2,
  ChevronDown,
  Command,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Network,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Workflow,
  X,
  Sparkles,
  ArrowUpRight,
  Sun,
  Moon,
  ChevronUp,
} from "lucide-react";
import { demoCompanies, demoMissions, demoProjects, sampleDocs } from "@/lib/demo";
import type { Company, LocalDoc, Mission, Project, Store, View } from "@/lib/types";

const INITIAL: Store = { companies: [], projects: [], missions: [], localDocs: [] };
const STORAGE_KEY = "autonomous-os-simple-ui-v1";
type ProjectResumeNote = { text: string; savedAt: string };

const NAV: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "now", label: "Ahora", icon: LayoutDashboard },
  { key: "companies", label: "Empresas", icon: Building2 },
  { key: "workflows", label: "Workflows", icon: Workflow },
  { key: "results", label: "Resultados", icon: Activity },
  { key: "systems", label: "Sistema", icon: Settings2 },
];

const COMPANY_TABS: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "company", label: "Resumen", icon: Building2 },
  { key: "projects", label: "Proyectos", icon: FolderKanban },
  { key: "missions", label: "Misiones", icon: Bot },
  { key: "docs", label: "Docs", icon: BookOpen },
  { key: "departments", label: "Departamentos", icon: Network },
];
const COMPANY_VIEWS: View[] = COMPANY_TABS.map(item => item.key);

const STAGE_LABEL: Record<Project["stage"], string> = {
  idea: "Idea",
  planning: "Planeación",
  active: "Activo",
  waiting: "En espera",
  completed: "Finalizado",
};

const ASSIGNEE_LABEL: Record<Mission["assignee"], string> = {
  claude: "Claude Code",
  codex: "ChatGPT / Codex",
  grok: "Grok",
  unassigned: "Sin asignar",
};

const DEPARTMENTS = [
  ["Dirección", "Objetivos, decisiones y prioridades"],
  ["Ingeniería", "Desarrollo, QA y despliegues"],
  ["Ventas", "Prospectos, propuestas y seguimiento"],
  ["Marketing", "Campañas, contenidos y distribución"],
  ["Operaciones", "Procesos, dependencias y proveedores"],
  ["Finanzas", "Costos, margen y cobranza"],
] as const;

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "green" | "amber" | "blue" }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-header-simple">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state-simple">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function OperatingConsole() {
  const [view, setView] = useState<View>("now");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [store, setStore] = useState<Store>(INITIAL);
  const [demoMode, setDemoMode] = useState(true);
  const [companyId, setCompanyId] = useState("evo");
  const [ready, setReady] = useState(false);
  const [resumeNotes, setResumeNotes] = useState<Record<string, ProjectResumeNote>>({});
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [showAllPostits, setShowAllPostits] = useState(false);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [modal, setModal] = useState<"company" | "project" | "mission" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignee, setAssignee] = useState<Mission["assignee"]>("unassigned");
  const [docId, setDocId] = useState("overview");
  const [docText, setDocText] = useState("");
  const [docRaw, setDocRaw] = useState(false);
  const [docError, setDocError] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [crobi, setCrobi] = useState<{ connected: boolean; configured: boolean; label: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { store?: Partial<Store>; demoMode?: boolean; companyId?: string; theme?: "light" | "dark"; resumeNotes?: Record<string, ProjectResumeNote> };
        setStore({ ...INITIAL, ...parsed.store });
        if (typeof parsed.demoMode === "boolean") setDemoMode(parsed.demoMode);
        if (parsed.companyId) setCompanyId(parsed.companyId);
        if (parsed.resumeNotes && typeof parsed.resumeNotes === "object" && !Array.isArray(parsed.resumeNotes)) {
          setResumeNotes(parsed.resumeNotes);
        }
        if (parsed.theme === "light" || parsed.theme === "dark") setTheme(parsed.theme);
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify({ store, demoMode, companyId, theme, resumeNotes }));
  }, [ready, store, demoMode, companyId, theme, resumeNotes]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setCompanyOpen(false);
        setModal(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    fetch("/api/crobi/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setCrobi)
      .catch(() => setCrobi({ connected: false, configured: false, label: "Sin conexión" }));
  }, []);


  const companies = useMemo(() => [...demoCompanies, ...store.companies], [store.companies]);
  const company = companies.find((c) => c.id === companyId) ?? companies[0];
  const projects = useMemo(
    () => [...(demoMode ? demoProjects : []), ...store.projects].filter((item) => item.companyId === company?.id),
    [demoMode, store.projects, company?.id],
  );
  const missions = useMemo(
    () => [...(demoMode ? demoMissions : []), ...store.missions].filter((item) => item.companyId === company?.id),
    [demoMode, store.missions, company?.id],
  );
  const docs = [
    ...sampleDocs.filter((item) => item.companyId === "all" || item.companyId === company?.id),
    ...store.localDocs
      .filter((item) => item.companyId === company?.id)
      .map((item) => ({ id: item.id, name: item.name, path: `${item.name}.md`, companyId: item.companyId, category: "Importados" })),
  ];

  // Company-owned docs are filtered separately from deliberately shared docs.
  const companyDocs = docs.filter(item => item.companyId === company?.id);
  const sharedDocs = docs.filter(item => item.companyId === "all");
  const effectiveDocId = docs.some(item => item.id === docId) ? docId : (companyDocs[0]?.id ?? sharedDocs[0]?.id ?? "overview");
  const allProjects = [...(demoMode ? demoProjects : []), ...store.projects];
  const allMissions = [...(demoMode ? demoMissions : []), ...store.missions];
  const globalOpenProjects = allProjects.filter(item => item.stage === "active" || item.stage === "planning").length;
  const resumeProjects = [...allProjects].sort((a, b) => {
    const noteA = resumeNotes[a.id]?.savedAt ?? "";
    const noteB = resumeNotes[b.id]?.savedAt ?? "";
    if (noteA !== noteB) return noteB.localeCompare(noteA);
    const order: Record<Project["stage"], number> = { active: 0, planning: 1, waiting: 2, idea: 3, completed: 4 };
    return order[a.stage] - order[b.stage] || b.createdAt.localeCompare(a.createdAt);
  });
  const visibleResumeProjects = resumeProjects.slice(0, showAllPostits ? resumeProjects.length : 9);
  const globalAssignedMissions = allMissions.filter(item => item.assignee !== "unassigned").length;
  const filteredViews = [...NAV, ...COMPANY_TABS].filter(item => item.label.toLowerCase().includes(query.toLowerCase().trim()));
  const filteredProjects = allProjects.filter(item => `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  const filteredMissions = allMissions.filter(item => `${item.title} ${item.outcome}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    let active = true;
    const localDoc = store.localDocs.find(d => d.id === effectiveDocId && d.companyId === company?.id);
    setDocText("");
    setDocError("");
    if (localDoc) { setDocText(localDoc.content); setDocLoading(false); return; }
    setDocLoading(true);
    fetch(`/api/docs?slug=${encodeURIComponent(effectiveDocId)}`)
      .then(async r => { if (!r.ok) throw Error("Document unavailable"); return r.json(); })
      .then((result: { content: string }) => { if (active) setDocText(result.content); })
      .catch(() => { if (active) setDocError("No fue posible cargar este documento."); })
      .finally(() => { if (active) setDocLoading(false); });
    return () => { active = false; };
  }, [effectiveDocId, company?.id, store.localDocs]);

  function navigate(next: View) {
    if (next !== "projects") setFocusedProjectId(null);
    setView(next);
    setSearchOpen(false);
    setMobileOpen(false);
  }

  function openCompany(id: string, next: View = "company") {
    if (next !== "projects") setFocusedProjectId(null);
    setCompanyId(id);
    setView(next);
    setCompanyOpen(false);
    setSearchOpen(false);
    setMobileOpen(false);
  }

  function toggleResumeProject(id: string) {
    if (expandedProjectId === id) { setExpandedProjectId(null); return; }
    setExpandedProjectId(id);
    setNoteDraft(resumeNotes[id]?.text ?? "");
  }

  function saveResumeNote(id: string) {
    const content = noteDraft.trim();
    setResumeNotes(current => {
      const next = { ...current };
      if (content) next[id] = { text: content, savedAt: new Date().toISOString() };
      else delete next[id];
      return next;
    });
  }

  function continueProject(project: Project) {
    setFocusedProjectId(project.id);
    openCompany(project.companyId, "projects");
  }

  function useWebsiteWorkflow() {
    if (!company) return;
    const mission: Mission = {
      id: uid(),
      companyId: company.id,
      title: "Cambio web con PR verificado",
      outcome: "Solicitud, cambio aislado, pruebas, revisión y aprobación humana antes de publicar",
      assignee: "claude",
      status: "local_draft",
      createdAt: new Date().toISOString(),
    };
    setStore(current => ({ ...current, missions: [...current.missions, mission] }));
    navigate("missions");
  }

  function openModal(kind: "company" | "project" | "mission") {
    setModal(kind);
    setName("");
    setDescription("");
    setProjectId("");
    setAssignee("unassigned");
  }

  function saveModal(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !company) return;

    if (modal === "company") {
      const next: Company = {
        id: uid(),
        name: trimmed,
        short: trimmed.slice(0, 2).toUpperCase(),
        description: description.trim(),
        accent: "#a6b0ff",
      };
      setStore((current) => ({ ...current, companies: [...current.companies, next] }));
      setCompanyId(next.id);
      setView("company");
    }

    if (modal === "project") {
      const next: Project = {
        id: uid(),
        companyId: company.id,
        name: trimmed,
        description: description.trim(),
        stage: "planning",
        createdAt: new Date().toISOString(),
      };
      setStore((current) => ({ ...current, projects: [...current.projects, next] }));
      setView("projects");
    }

    if (modal === "mission") {
      const next: Mission = {
        id: uid(),
        companyId: company.id,
        projectId: projectId || undefined,
        title: trimmed,
        outcome: description.trim(),
        assignee,
        status: "local_draft",
        createdAt: new Date().toISOString(),
      };
      setStore((current) => ({ ...current, missions: [...current.missions, next] }));
      setView("missions");
    }

    setModal(null);
  }

  function updateProjectStage(id: string, stage: Project["stage"]) {
    setStore((current) => ({
      ...current,
      projects: current.projects.map((item) => (item.id === id ? { ...item, stage } : item)),
    }));
  }

  async function importMarkdown(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !company) return;
    if (!file.name.toLowerCase().endsWith(".md") || file.size > 512_000) {
      setDocError("Selecciona un archivo .md de hasta 500 KB.");
      return;
    }
    const content = await file.text();
    const next: LocalDoc = {
      id: uid(),
      companyId: company.id,
      name: file.name.replace(/\.md$/i, ""),
      content,
      createdAt: new Date().toISOString(),
    };
    setStore((current) => ({ ...current, localDocs: [next, ...current.localDocs] }));
    setDocId(next.id);
    setDocError("");
    event.target.value = "";
  }

  const focusMission = allMissions.find(item => !item.demo) ?? allMissions[0];
  const focusCompany = companies.find(item => item.id === focusMission?.companyId);
  const activeGlobalView = COMPANY_VIEWS.includes(view) ? "companies" : view;

  return (
    <div className={`simple-shell sana-shell theme-${theme}`}>
      <aside className={`simple-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="simple-brand">
          <div className="brand-dot"><Sparkles size={17}/></div>
          <div>
            <strong>Autonomous OS</strong>
            <small>Workspace</small>
          </div>
        </div>

        <button className="company-switch" onClick={() => setCompanyOpen((value) => !value)}>
          <div>
            <span className="label">Empresa actual</span>
            <strong>{company?.name ?? "Sin empresa"}</strong>
          </div>
          <ChevronDown size={16} />
        </button>

        {companyOpen && (
          <div className="company-menu">
            {companies.map((item) => (
              <button
                key={item.id}
                className={`company-option ${item.id === company?.id ? "active" : ""}`}
                onClick={() => {
                  openCompany(item.id);
                }}
              >
                <span>{item.short}</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.demo ? "Demo" : "Local"}</small>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="sana-side-label">NAVEGACIÓN</div>
        <nav className="simple-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={activeGlobalView === item.key ? "active" : ""} onClick={() => navigate(item.key)}>
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sana-side-spaces">
          <div className="sana-spaces-heading"><span>ESPACIOS</span><button aria-label="Nueva empresa" title="Nueva empresa" onClick={() => openModal("company")}><Plus size={15}/></button></div>
          {companies.slice(0, 6).map(item => (
            <button key={item.id} className={view !== "now" && COMPANY_VIEWS.includes(view) && company?.id === item.id ? "selected" : ""} onClick={() => openCompany(item.id)}>
              <span className="sana-space-dot" style={{background: item.accent || "#9da7fb"}}/>
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        <div className="simple-sidebar-footer">
          <button className="sana-theme-toggle" onClick={() => setTheme(current => current === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}>
            {theme === "light" ? <Moon size={16}/> : <Sun size={16}/>}<span>{theme === "light" ? "Modo oscuro" : "Modo claro"}</span>
          </button>
          <label className="demo-toggle">
            <input type="checkbox" checked={demoMode} onChange={() => setDemoMode((value) => !value)} />
            <span>Mostrar ejemplos</span>
          </label>
          <div className="status-mini">
            <span className={`dot ${crobi?.connected ? "online" : "offline"}`} />
            <span>{crobi?.label ?? "Comprobando Crobi"}</span>
          </div>
        </div>
      </aside>

      <main className="simple-main">
        <header className="simple-topbar">
          <button className="icon-btn mobile-only" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
            <Menu size={18} />
          </button>
          <button className="search-btn" onClick={() => setSearchOpen(true)}>
            <Search size={16} />
            <span>Buscar en tu espacio de trabajo</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="topbar-actions">
            {COMPANY_VIEWS.includes(view)
              ? <button className="primary-btn" onClick={() => openModal("mission")}>Nueva misión</button>
              : <button className="secondary-btn" onClick={() => navigate("companies")}>Explorar empresas</button>}
          </div>
        </header>

        <section className={`simple-content ${view === "now" ? "sana-home-content" : "sana-workspace-content"}`}>
          {COMPANY_VIEWS.includes(view) && (
            <>
              <div className="workspace-breadcrumb">
                <button onClick={() => navigate("companies")}>Empresas</button><span>/</span><strong>{company?.name}</strong>
              </div>
              <nav className="company-tabs" aria-label="Secciones de la empresa">
                {COMPANY_TABS.map(tab => (
                  <button key={tab.key} className={view === tab.key ? "active" : ""} onClick={() => navigate(tab.key)}>{tab.label}</button>
                ))}
              </nav>
            </>
          )}

          {view === "now" && (
            <div className="sana-home-stack">
              <section className="sana-home-hero">
                <div className="sana-greeting-icon"><Sparkles size={20}/></div>
                <h1>Hola, ¿en qué trabajamos hoy?</h1>
                <p>Un espacio para pensar, crear y avanzar.</p>


                <div className="sana-resume-heading">
                  <div><span className="sana-resume-eyebrow">RETOMA EL HILO</span>
                    <h2>Continúa donde te quedaste</h2>
                    <p>Proyectos, contexto y misiones a un clic de distancia.</p>
                  </div>
                  <div className="sana-resume-actions">
                    <span>{resumeProjects.length} {resumeProjects.length === 1 ? "proyecto" : "proyectos"}</span>
                    {resumeProjects.length > 9 && <button onClick={() => setShowAllPostits(value => !value)} aria-expanded={showAllPostits}>
                      {showAllPostits ? "Ver nueve" : "Ver todos (" + resumeProjects.length + ")"}
                      {showAllPostits ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                    </button>}
                  </div>
                </div>
                {resumeProjects.length === 0 ? <div className="sana-postit-empty">
                    <FolderKanban size={22}/>
                    <strong>Tu tablero está listo para nuevos proyectos.</strong>
                    <p>Crea un proyecto y aparecerá aquí para retomarlo cuando quieras.</p>
                    <button className="primary-btn" onClick={() => openModal("project")}>Crear proyecto <Plus size={15}/></button>
                  </div> :
                  <div className="sana-postit-grid">
                    {visibleResumeProjects.map((project, index) => {
                      const owner = companies.find(item => item.id === project.companyId);
                      const linkedMissions = allMissions.filter(item => item.projectId === project.id);
                      const linkedMission = linkedMissions.find(item => !item.demo) ?? linkedMissions[0];
                      const savedNote = resumeNotes[project.id];
                      const expanded = expandedProjectId === project.id;
                      const noteChanged = noteDraft.trim() !== (savedNote?.text ?? "");
                      return <article key={project.id} className={"sana-postit sana-postit-tone-" + (index % 9) + (expanded ? " is-expanded" : "")}>
                        <div className="sana-postit-topline">
                          <span className="sana-postit-company"><span className="sana-postit-bullet"/>{owner?.name ?? "Empresa"}</span>
                          <button className="sana-postit-expand" type="button" aria-expanded={expanded} aria-label={(expanded ? "Contraer " : "Expandir ") + project.name} onClick={() => toggleResumeProject(project.id)}>
                            {expanded ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}
                          </button>
                        </div>
                        <button className="sana-postit-main" type="button" onClick={() => toggleResumeProject(project.id)} aria-expanded={expanded}>
                          <span className="sana-postit-category">{savedNote ? "TU ÚLTIMA NOTA" : linkedMission ? "MISIÓN VINCULADA" : "CONTEXTO DEL PROYECTO"}</span>
                          <strong>{project.name}</strong>
                          <span className="sana-postit-preview">{savedNote?.text || linkedMission?.outcome || project.description || "Agrega una nota para recordar el avance."}</span>
                        </button>
                        <div className="sana-postit-footer">
                          <span className="sana-postit-stage">{STAGE_LABEL[project.stage]}{project.demo ? " · Demo" : ""}</span>
                          <button className="sana-postit-continue" type="button" onClick={() => continueProject(project)}>Continuar <ArrowUpRight size={15}/></button>
                        </div>
                        {expanded && <div className="sana-postit-details">
                          <div className="sana-postit-divider"/>
                          <span className="sana-postit-detail-label">CONTEXTO</span>
                          <p>{project.description || "Sin descripción de proyecto."}</p>
                          {linkedMission && <div className="sana-postit-related">
                            <span>Misión relacionada</span>
                            <strong>{linkedMission.title}</strong>
                            <button onClick={() => openCompany(project.companyId, "missions")}>Ver misiones <ArrowUpRight size={14}/></button>
                          </div>}
                          <label className="sana-postit-detail-label" htmlFor={"resume-" + project.id}>DÓNDE ME QUEDÉ</label>
                          <textarea id={"resume-" + project.id} rows={3} maxLength={1200} placeholder="Escribe el último avance y qué sigue..." value={noteDraft} onChange={event => setNoteDraft(event.target.value)}/>
                          <div className="sana-postit-note-actions">
                            <span>{savedNote ? "Nota guardada · " + new Date(savedNote.savedAt).toLocaleDateString("es-MX", { day:"numeric", month:"short" }) : "Solo en este navegador"}</span>
                            <button disabled={!noteChanged} onClick={() => saveResumeNote(project.id)}>Guardar nota</button>
                          </div>
                        </div>}
                      </article>;
                    })}
                  </div>}
                <div className="sana-postit-tail">
                  <span>{resumeProjects.length > 9 && !showAllPostits ? "Mostrando nueve proyectos" : "Ordenados por tus notas y su estado"} · Notas locales.</span>
                  <button onClick={() => navigate("companies")}>Explorar empresas <ArrowUpRight size={14}/></button>
                </div>

                <div className="sana-command-input">
                  <button className="sana-command-plus" aria-label="Nueva misión" title="Nueva misión" onClick={() => openModal("mission")}><Plus size={19}/></button>
                  <button className="sana-command-placeholder" onClick={() => openModal("mission")}>Pide un resultado o describe una misión...</button>
                  <button className="sana-command-send" aria-label="Crear misión" onClick={() => openModal("mission")}><ArrowUpRight size={18}/></button>
                </div>
                <p className="sana-command-help">Los borradores se guardan localmente. No se ejecutan agentes desde esta versión.</p>
              </section>

              <section className="sana-home-overview">
                <div className="sana-activity-heading">
                  <div>
                    <h2>Tu espacio de trabajo</h2>
                    <p>Un vistazo a lo que tienes en marcha</p>
                  </div>
                  <button onClick={() => navigate("companies")}>Ver empresas <ArrowUpRight size={15}/></button>
                </div>
                <div className="sana-activity-list">
                  <button className="sana-activity-row" onClick={() => focusCompany ? openCompany(focusCompany.id, "missions") : navigate("companies")}>
                    <span className="sana-activity-icon sana-activity-icon-lilac"><Bot size={17}/></span>
                    <span className="sana-activity-copy"><strong>{focusMission?.title ?? "Aún no hay misiones"}</strong><small>{focusCompany?.name ?? "Crea una misión para empezar"} · {focusMission?.demo ? "Ejemplo" : "Borrador local"}</small></span>
                    <span className="sana-activity-meta">Misiones <ArrowUpRight size={15}/></span>
                  </button>
                  <button className="sana-activity-row" onClick={() => navigate("companies")}>
                    <span className="sana-activity-icon sana-activity-icon-blue"><FolderKanban size={17}/></span>
                    <span className="sana-activity-copy"><strong>{globalOpenProjects} proyectos abiertos</strong><small>Distribuidos entre {companies.length} empresas</small></span>
                    <span className="sana-activity-meta">Proyectos <ArrowUpRight size={15}/></span>
                  </button>
                  <button className="sana-activity-row" onClick={() => navigate("systems")}>
                    <span className="sana-activity-icon sana-activity-icon-sand"><ShieldCheck size={17}/></span>
                    <span className="sana-activity-copy"><strong>Crobi {crobi?.connected ? "conectado" : "sin conectar"}</strong><small>{globalAssignedMissions} misiones asignadas · Ver conexiones y permisos</small></span>
                    <span className="sana-activity-meta">Sistema <ArrowUpRight size={15}/></span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {view === "companies" && (
            <>
              <SectionHeader title="Empresas" description="Cada empresa tiene su propio espacio para proyectos, misiones y documentos. Los workflows son compartidos." action={<button className="primary-btn" onClick={() => openModal("company")}><Plus size={16}/> Nueva empresa</button>} />
              <div className="sana-company-bento-gallery">
                {companies.map((item, index) => {
                  const ownProjects = [...(demoMode ? demoProjects : []), ...store.projects].filter(project => project.companyId === item.id);
                  const ownMissions = [...(demoMode ? demoMissions : []), ...store.missions].filter(mission => mission.companyId === item.id);
                  const ownDocsCount = sampleDocs.filter(doc => doc.companyId === item.id).length + store.localDocs.filter(doc => doc.companyId === item.id).length;
                  const inProgress = ownProjects.filter(project => project.stage === "active" || project.stage === "planning").length;
                  const nextMission = ownMissions.find(mission => !mission.demo) ?? ownMissions[0];

                  return (
                    <article key={item.id} className={`sana-company-bento sana-company-tone-${index % 4}`} aria-label={`Espacio de ${item.name}`}>
                      <div className="sana-company-bento-grid">
                        <button type="button" className="sana-bento-identity" onClick={() => openCompany(item.id)} aria-label={`Abrir workspace de ${item.name}`}>
                          <span className="sana-bento-wordmark">{item.short}</span>
                          <span className="sana-bento-identity-copy">
                            <span className="sana-bento-eyebrow">ESPACIO DE TRABAJO {item.demo ? "· DEMO" : ""}</span>
                            <strong>{item.name}</strong>
                            <small>{item.description || "Organiza los proyectos y el equipo en un solo lugar."}</small>
                          </span>
                          <span className="sana-bento-up"><ArrowUpRight size={18}/></span>
                        </button>

                        <button type="button" className="sana-bento-tile sana-bento-projects" onClick={() => openCompany(item.id, "projects")} aria-label={`Ver proyectos de ${item.name}`}>
                          <span>Proyectos</span>
                          <strong>{ownProjects.length}</strong>
                          <small>{inProgress} en marcha</small>
                          <FolderKanban size={18} className="sana-bento-corner-icon"/>
                        </button>

                        <button type="button" className="sana-bento-tile sana-bento-missions" onClick={() => openCompany(item.id, "missions")} aria-label={`Ver misiones de ${item.name}`}>
                          <span>Misiones</span>
                          <strong>{ownMissions.length}</strong>
                          <Bot size={18} className="sana-bento-corner-icon"/>
                        </button>

                        <button type="button" className="sana-bento-tile sana-bento-docs" onClick={() => openCompany(item.id, "docs")} aria-label={`Ver documentos de ${item.name}`}>
                          <span>Docs propios</span>
                          <strong>{ownDocsCount}</strong>
                          <BookOpen size={18} className="sana-bento-corner-icon"/>
                        </button>

                        <button type="button" className="sana-bento-tile sana-bento-open" onClick={() => openCompany(item.id)}>
                          <span>Entrar al</span>
                          <strong>workspace</strong>
                          <ArrowUpRight size={18} className="sana-bento-corner-icon"/>
                        </button>

                        <button type="button" className="sana-bento-next" onClick={() => openCompany(item.id, "missions")}>
                          <span className="sana-bento-next-copy">
                            <small>{nextMission ? (nextMission.demo ? "MISIÓN DE EJEMPLO" : "PRÓXIMA MISIÓN") : "SIGUIENTE PASO"}</small>
                            <strong>{nextMission?.title ?? "Crear la primera misión"}</strong>
                          </span>
                          <span className="sana-bento-next-action">Continuar <ArrowUpRight size={16}/></span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {view === "company" && (
            <>
              <SectionHeader title={company?.name ?? "Empresa"} description={company?.description || "Todo el trabajo de esta empresa, en un solo espacio."} />
              <div className="company-overview-strip">
                <button onClick={() => navigate("projects")}><span>Proyectos</span><strong>{projects.length}</strong><small>Ver proyectos</small></button>
                <button onClick={() => navigate("missions")}><span>Misiones</span><strong>{missions.length}</strong><small>Ver misiones</small></button>
                <button onClick={() => navigate("docs")}><span>Docs propios</span><strong>{companyDocs.length}</strong><small>{sharedDocs.length} compartidos adicionales</small></button>
              </div>
              <section className="card">
                <div className="block-heading"><h3>Proyectos de {company?.name}</h3><button className="text-btn" onClick={() => navigate("projects")}>Ver todos</button></div>
                {projects.length === 0
                  ? <EmptyState title="Sin proyectos" description="Crea un proyecto dentro de este negocio." action={<button className="secondary-btn" onClick={() => openModal("project")}>Crear proyecto</button>} />
                  : <div className="simple-table">
                      <div className="table-row table-head"><span>Proyecto</span><span>Estado</span><span>Origen</span></div>
                      {projects.slice(0,5).map(item => <div className="table-row" key={item.id}>
                        <div><strong>{item.name}</strong><small>{item.description}</small></div>
                        <Badge>{STAGE_LABEL[item.stage]}</Badge><span className="muted-inline">{item.demo ? "Demo" : "Local"}</span>
                      </div>)}
                    </div>}
              </section>
            </>
          )}

          {view === "departments" && (
            <>
              <SectionHeader title="Departamentos" description={`Departamentos propuestos de ${company?.name}. Aún sin ejecución real.`} />
              <div className="card">
                <div className="simple-table">
                  <div className="table-row table-head"><span>Departamento</span><span>Responsabilidad</span></div>
                  {DEPARTMENTS.map(([dept, desc]) => (
                    <div className="table-row two-col" key={dept}><strong>{dept}</strong><span>{desc}</span></div>
                  ))}
                </div>
              </div>
            </>
          )}

          {view === "projects" && (
            <>

              <SectionHeader title="Proyectos" description={"Proyectos exclusivos de " + company?.name + "."} action={<button className="primary-btn" onClick={() => openModal("project")}>Crear proyecto</button>} />
              {focusedProjectId && projects.some(item => item.id === focusedProjectId) && (() => {
                const focus = projects.find(item => item.id === focusedProjectId)!;
                const note = resumeNotes[focus.id];
                const related = missions.filter(item => item.projectId === focus.id);
                return <section className="card sana-project-resume-panel">
                  <div className="sana-project-resume-head"><div><span>RETOMANDO PROYECTO</span><h2>{focus.name}</h2></div><button className="sana-project-resume-dismiss" onClick={() => setFocusedProjectId(null)} aria-label="Cerrar detalle del proyecto"><X size={16}/></button></div>
                  <p>{focus.description || "Sin descripción todavía."}</p>
                  <div className="sana-project-resume-tags"><Badge>{STAGE_LABEL[focus.stage]}</Badge>{focus.demo && <Badge tone="amber">Ejemplo</Badge>}<Badge>{related.length} {related.length === 1 ? "misión" : "misiones"}</Badge></div>
                  {note && <div className="sana-project-resume-note"><span>TU ÚLTIMA NOTA</span><p>{note.text}</p></div>}
                  {related.length > 0 && <div className="sana-project-resume-related"><span>MISIONES VINCULADAS</span>{related.slice(0, 3).map(item => <p key={item.id}>{item.title}</p>)}<button onClick={() => navigate("missions")}>Abrir misiones <ArrowUpRight size={14}/></button></div>}
                </section>;
              })()}
              <section className="card">
                {projects.length === 0 ? (
                  <EmptyState title="Sin proyectos" description="Agrega un proyecto para empezar a agrupar documentos y misiones." action={<button className="secondary-btn" onClick={() => openModal("project")}>Crear proyecto</button>} />
                ) : (
                  <div className="simple-table">
                    <div className="table-row table-head"><span>Proyecto</span><span>Estado</span><span>Creado</span></div>
                    {projects.map((item) => (
                      <div className="table-row" key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.description || "Sin descripción"}</small>
                        </div>
                        {item.demo ? (
                          <Badge tone="amber">{STAGE_LABEL[item.stage]}</Badge>
                        ) : (
                          <select className="simple-select" value={item.stage} onChange={(event) => updateProjectStage(item.id, event.target.value as Project["stage"])}>
                            {Object.entries(STAGE_LABEL).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                          </select>
                        )}
                        <span className="muted-inline">{new Date(item.createdAt).toLocaleDateString("es-MX")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {view === "missions" && (
            <>
              <SectionHeader title="Misiones" description={`Misiones y borradores de ${company?.name}. Aún no ejecutan agentes.`} action={<button className="primary-btn" onClick={() => openModal("mission")}>Nueva misión</button>} />
              <section className="card">
                {missions.length === 0 ? (
                  <EmptyState title="Sin misiones" description="Describe qué resultado quieres obtener para esta empresa." action={<button className="secondary-btn" onClick={() => openModal("mission")}>Crear misión</button>} />
                ) : (
                  <div className="simple-table">
                    <div className="table-row table-head"><span>Misión</span><span>Ejecutor</span><span>Proyecto</span></div>
                    {missions.map((item) => (
                      <div className="table-row" key={item.id}>
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.outcome || "Resultado pendiente de definir"}</small>
                        </div>
                        <Badge tone={item.assignee === "unassigned" ? "default" : "blue"}>{ASSIGNEE_LABEL[item.assignee]}</Badge>
                        <span className="muted-inline">{projects.find((p) => p.id === item.projectId)?.name ?? "Sin proyecto"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {view === "docs" && (
            <>
              <SectionHeader title="Docs" description={`Documentos de ${company?.name}, más documentos compartidos. Los importados siguen siendo locales.`} action={<><input ref={fileRef} type="file" accept=".md,text/markdown" hidden onChange={importMarkdown} /><button className="secondary-btn" onClick={() => fileRef.current?.click()}>Importar .md</button></>} />
              <div className="docs-layout-simple">
                <aside className="card docs-nav-simple">
                  <div className="docs-group-label">DE {company?.name?.toUpperCase()}</div>
                  {companyDocs.length ? companyDocs.map(item => (
                    <button key={item.id} className={effectiveDocId === item.id ? "active" : ""} onClick={() => {setDocId(item.id);setDocRaw(false);}}>
                      <span>{item.name}</span><small>Solo esta empresa · {item.category}</small>
                    </button>
                  )) : <p className="docs-none">Sin documentos propios todavía.</p>}
                  <div className="docs-group-label">COMPARTIDOS</div>
                  {sharedDocs.map(item => (
                    <button key={item.id} className={effectiveDocId === item.id ? "active" : ""} onClick={() => {setDocId(item.id);setDocRaw(false);}}>
                      <span>{item.name}</span><small>Disponible en todas las empresas</small>
                    </button>
                  ))}
                </aside>
                <section className="card docs-reader-simple">
                  <div className="docs-reader-head">
                    <strong>{docs.find((item) => item.id === effectiveDocId)?.name ?? "Documento"}</strong>
                    <div className="tab-switch-simple">
                      <button className={!docRaw ? "active" : ""} onClick={() => setDocRaw(false)}>Vista</button>
                      <button className={docRaw ? "active" : ""} onClick={() => setDocRaw(true)}>Markdown</button>
                    </div>
                  </div>
                  {docLoading ? (
                    <div className="docs-message">Cargando documento…</div>
                  ) : docError ? (
                    <div className="docs-message">{docError}</div>
                  ) : docRaw ? (
                    <pre className="markdown-source-simple">{docText}</pre>
                  ) : (
                    <div className="markdown-body-simple"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{docText}</ReactMarkdown></div>
                  )}
                </section>
              </div>
            </>
          )}

          {view === "workflows" && (
            <>
              <SectionHeader title="Workflows" description="Biblioteca global de procesos reutilizables. Al aplicar una plantilla, el resultado pertenece a una empresa." />
              <section className="card workflow-card-simple">
                <Badge tone="blue">WORKFLOW 001</Badge>
                <h2>Website Change → Verified PR</h2>
                <p>Solicitud → contexto → ejecución → verificación → aprobación. Ese es el proceso base para ingeniería autónoma.</p>
                <ol>
                  <li>Se crea la misión con alcance y criterios de aceptación.</li>
                  <li>Crobi entrega contexto y permisos al ejecutor.</li>
                  <li>Claude Code o Codex trabajan en una rama aislada.</li>
                  <li>Se reúnen pruebas, diff y evidencia.</li>
                  <li>Tú apruebas antes de fusionar o publicar.</li>
                </ol>
                <div className="workflow-reuse-bar"><span>Plantilla global · Crear borrador para <strong>{company?.name}</strong></span><button className="primary-btn" onClick={useWebsiteWorkflow}>Usar en esta empresa</button></div>
              </section>
            </>
          )}

          {view === "results" && (
            <>
              <SectionHeader title="Resultados" description="Métricas globales verificadas entre empresas, sin cifras inventadas." />
              <div className="stats-grid-simple">
                <div className="card stat-card"><span>Misiones verificadas</span><strong>—</strong><small>Necesita datos reales de Crobi</small></div>
                <div className="card stat-card"><span>Tiempo recuperado</span><strong>—</strong><small>Necesita instrumentación</small></div>
                <div className="card stat-card"><span>Costo por resultado</span><strong>—</strong><small>Necesita usage ledger</small></div>
                <div className="card stat-card"><span>Intervenciones evitadas</span><strong>—</strong><small>Necesita comparación real</small></div>
              </div>
            </>
          )}

          {view === "systems" && (
            <>
              <SectionHeader title="Sistema" description="Runtimes, seguridad y conexión con Crobi. Simplificado a lo esencial." />
              <section className="card">
                <div className="system-row-simple"><span>Crobi Control Plane</span><Badge tone={crobi?.connected ? "green" : "amber"}>{crobi?.label ?? "Comprobando"}</Badge></div>
                <div className="system-row-simple"><span>Claude Code</span><Badge>Sin conectar</Badge></div>
                <div className="system-row-simple"><span>ChatGPT / Codex</span><Badge>Sin conectar</Badge></div>
                <div className="system-row-simple"><span>Grok</span><Badge>Sin conectar</Badge></div>
                <p className="system-note">Esta versión no guarda credenciales en el navegador y no ejecuta acciones externas.</p>
              </section>
            </>
          )}
        </section>
      </main>

      {mobileOpen && <button className="overlay" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}

      {searchOpen && (
        <div className="overlay-panel" onClick={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
          <div className="search-panel">
            <div className="search-head"><Command size={16} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar vista, proyecto o misión" /></div>
            <div className="search-results">
              <small>Vistas</small>
              {filteredViews.map(item => (
                <button key={item.key} onClick={() => navigate(item.key)}>{COMPANY_VIEWS.includes(item.key) ? `Empresas / ${item.label}` : item.label}</button>
              ))}
              <small>Proyectos</small>
              {filteredProjects.slice(0, 4).map(item => (
                <button key={item.id} onClick={() => openCompany(item.companyId, "projects")}>{item.name} · {companies.find(c=>c.id===item.companyId)?.name}</button>
              ))}
              <small>Misiones</small>
              {filteredMissions.slice(0, 4).map(item => (
                <button key={item.id} onClick={() => openCompany(item.companyId, "missions")}>{item.title} · {companies.find(c=>c.id===item.companyId)?.name}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="overlay-panel" onClick={(event) => event.target === event.currentTarget && setModal(null)}>
          <form className="modal-card-simple" onSubmit={saveModal}>
            <div className="modal-head-simple">
              <div>
                <strong>
                  {modal === "company" ? "Nueva empresa" : modal === "project" ? "Nuevo proyecto" : "Nueva misión"}
                </strong>
                <p>
                  {modal === "company" ? "Crea un workspace nuevo." : modal === "project" ? "Agrega un proyecto a la empresa actual." : "Define un resultado esperado."}
                </p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <label>
              Nombre
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder={modal === "mission" ? "Ej. Preparar propuesta comercial" : "Nombre"} />
            </label>
            <label>
              {modal === "mission" ? "Resultado esperado" : "Descripción"}
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
            </label>
            {modal === "mission" && (
              <>
                <label>
                  Proyecto
                  <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                    <option value="">Sin proyecto</option>
                    {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label>
                  Ejecutador preferido
                  <select value={assignee} onChange={(event) => setAssignee(event.target.value as Mission["assignee"])}>
                    {Object.entries(ASSIGNEE_LABEL).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                  </select>
                </label>
              </>
            )}
            <div className="modal-actions-simple">
              <button type="button" className="secondary-btn" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="primary-btn">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
