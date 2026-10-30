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
} from "lucide-react";
import { demoCompanies, demoMissions, demoProjects, sampleDocs } from "@/lib/demo";
import type { Company, LocalDoc, Mission, Project, Store, View } from "@/lib/types";

const INITIAL: Store = { companies: [], projects: [], missions: [], localDocs: [] };
const STORAGE_KEY = "autonomous-os-simple-ui-v1";

const NAV: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "now", label: "Ahora", icon: LayoutDashboard },
  { key: "companies", label: "Empresas", icon: Building2 },
  { key: "departments", label: "Departamentos", icon: Network },
  { key: "projects", label: "Proyectos", icon: FolderKanban },
  { key: "missions", label: "Misiones", icon: Bot },
  { key: "docs", label: "Docs", icon: BookOpen },
  { key: "workflows", label: "Workflows", icon: Workflow },
  { key: "results", label: "Resultados", icon: Activity },
  { key: "systems", label: "Sistema", icon: Settings2 },
];

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
  const [store, setStore] = useState<Store>(INITIAL);
  const [demoMode, setDemoMode] = useState(true);
  const [companyId, setCompanyId] = useState("evo");
  const [ready, setReady] = useState(false);
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
        const parsed = JSON.parse(raw) as { store?: Partial<Store>; demoMode?: boolean; companyId?: string };
        setStore({ ...INITIAL, ...parsed.store });
        if (typeof parsed.demoMode === "boolean") setDemoMode(parsed.demoMode);
        if (parsed.companyId) setCompanyId(parsed.companyId);
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify({ store, demoMode, companyId }));
  }, [ready, store, demoMode, companyId]);

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

  useEffect(() => {
    const localDoc = store.localDocs.find((d) => d.id === docId);
    if (localDoc) {
      setDocText(localDoc.content);
      setDocError("");
      setDocLoading(false);
      return;
    }
    setDocLoading(true);
    setDocError("");
    fetch(`/api/docs?id=${encodeURIComponent(docId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Not available");
        return r.json();
      })
      .then((j: { source: string }) => setDocText(j.source))
      .catch(() => {
        setDocText("");
        setDocError("No fue posible cargar este documento.");
      })
      .finally(() => setDocLoading(false));
  }, [docId, store.localDocs]);

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

  const openProjects = projects.filter((item) => item.stage === "active" || item.stage === "planning").length;
  const assignedMissions = missions.filter((item) => item.assignee !== "unassigned").length;
  const filteredViews = NAV.filter((item) => item.label.toLowerCase().includes(query.toLowerCase().trim()));
  const filteredProjects = projects.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  const filteredMissions = missions.filter((item) => `${item.title} ${item.outcome}`.toLowerCase().includes(query.toLowerCase()));

  function navigate(next: View) {
    setView(next);
    setSearchOpen(false);
    setMobileOpen(false);
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
      setView("companies");
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

  const focusMission = filteredMissions[0] ?? missions[0];
  const focusProject = filteredProjects[0] ?? projects[0];

  return (
    <div className="simple-shell">
      <aside className={`simple-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="simple-brand">
          <div className="brand-dot">A</div>
          <div>
            <strong>Autonomous OS</strong>
            <small>Control de negocios + Crobi</small>
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
                  setCompanyId(item.id);
                  setCompanyOpen(false);
                  setMobileOpen(false);
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

        <nav className="simple-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => navigate(item.key)}>
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="simple-sidebar-footer">
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
            <span>Buscar vista, proyecto o misión</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="topbar-actions">
            <button className="secondary-btn" onClick={() => openModal("project")}>Proyecto</button>
            <button className="primary-btn" onClick={() => openModal("mission")}>Nueva misión</button>
          </div>
        </header>

        <section className="simple-content">
          {view === "now" && (
            <>
              <SectionHeader
                title="Ahora"
                description="Una vista simple para decidir, no para administrar 50 tarjetas. Enfócate en lo siguiente y supervisa por excepción."
              />

              <div className="focus-grid">
                <section className="card focus-card">
                  <div className="card-topline">Siguiente decisión</div>
                  <h2>{focusMission?.title ?? "Aún no hay misiones"}</h2>
                  <p>{focusMission?.outcome ?? "Crea una misión para definir el siguiente resultado esperado."}</p>
                  <div className="focus-meta">
                    <Badge tone="blue">{focusMission ? ASSIGNEE_LABEL[focusMission.assignee] : "Sin asignar"}</Badge>
                    <Badge tone={focusMission?.demo ? "amber" : "default"}>{focusMission?.demo ? "Ejemplo" : "Borrador local"}</Badge>
                  </div>
                  <div className="focus-actions">
                    <button className="primary-btn" onClick={() => navigate("missions")}>Ver misiones</button>
                    <button className="secondary-btn" onClick={() => navigate("docs")}>Abrir docs</button>
                  </div>
                </section>

                <section className="card summary-card">
                  <div className="summary-row"><span>Proyectos abiertos</span><strong>{openProjects}</strong></div>
                  <div className="summary-row"><span>Misiones asignadas</span><strong>{assignedMissions}</strong></div>
                  <div className="summary-row"><span>Estado Crobi</span><strong>{crobi?.connected ? "Conectado" : "No conectado"}</strong></div>
                  <div className="summary-row"><span>Docs disponibles</span><strong>{docs.length}</strong></div>
                </section>
              </div>

              <div className="two-panel-grid">
                <section className="card">
                  <div className="block-heading">
                    <h3>Proyectos</h3>
                    <button className="text-btn" onClick={() => navigate("projects")}>Ver todos</button>
                  </div>
                  {projects.length === 0 ? (
                    <EmptyState title="Sin proyectos" description="Crea un proyecto para empezar a organizar trabajo con contexto." action={<button className="secondary-btn" onClick={() => openModal("project")}>Crear proyecto</button>} />
                  ) : (
                    <div className="simple-table">
                      <div className="table-row table-head"><span>Proyecto</span><span>Estado</span><span>Origen</span></div>
                      {projects.slice(0, 4).map((item) => (
                        <div className="table-row" key={item.id}>
                          <div>
                            <strong>{item.name}</strong>
                            <small>{item.description}</small>
                          </div>
                          <Badge>{STAGE_LABEL[item.stage]}</Badge>
                          <span className="muted-inline">{item.demo ? "Demo" : "Local"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="card">
                  <div className="block-heading">
                    <h3>Atajos</h3>
                  </div>
                  <div className="shortcut-list">
                    <button onClick={() => navigate("docs")}>Abrir base de conocimiento</button>
                    <button onClick={() => navigate("systems")}>Revisar runtimes y conexión</button>
                    <button onClick={() => navigate("workflows")}>Ver workflow activo</button>
                    <button onClick={() => openModal("company")}>Crear nueva empresa</button>
                  </div>
                </section>
              </div>
            </>
          )}

          {view === "companies" && (
            <>
              <SectionHeader title="Empresas" description="Cada negocio vive en su propio workspace. Menos ruido, mismo poder." action={<button className="primary-btn" onClick={() => openModal("company")}>Nueva empresa</button>} />
              <div className="stack-list">
                {companies.map((item) => (
                  <button key={item.id} className={`stack-item ${item.id === company?.id ? "selected" : ""}`} onClick={() => setCompanyId(item.id)}>
                    <div className="stack-item-main">
                      <span className="avatar-box">{item.short}</span>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.description || "Sin descripción"}</p>
                      </div>
                    </div>
                    <Badge tone={item.demo ? "amber" : "default"}>{item.demo ? "Ejemplo" : "Local"}</Badge>
                  </button>
                ))}
              </div>
            </>
          )}

          {view === "departments" && (
            <>
              <SectionHeader title="Departamentos" description="Mantengo la capacidad, pero la presento como una lista clara de responsabilidades." />
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
              <SectionHeader title="Proyectos" description="Tabla clara primero, detalles después. Menos tarjetas, misma información." action={<button className="primary-btn" onClick={() => openModal("project")}>Crear proyecto</button>} />
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
              <SectionHeader title="Misiones" description="Piensa en resultados esperados, no en tareas sueltas. Esta vista se queda limpia y supervisable." action={<button className="primary-btn" onClick={() => openModal("mission")}>Nueva misión</button>} />
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
              <SectionHeader title="Docs" description="Markdown bonito, simple y útil. Dos paneles, sin sobrecargar la lectura." action={<><input ref={fileRef} type="file" accept=".md,text/markdown" hidden onChange={importMarkdown} /><button className="secondary-btn" onClick={() => fileRef.current?.click()}>Importar .md</button></>} />
              <div className="docs-layout-simple">
                <aside className="card docs-nav-simple">
                  {docs.map((item) => (
                    <button key={item.id} className={docId === item.id ? "active" : ""} onClick={() => { setDocId(item.id); setDocRaw(false); }}>
                      <span>{item.name}</span>
                      <small>{item.category}</small>
                    </button>
                  ))}
                </aside>
                <section className="card docs-reader-simple">
                  <div className="docs-reader-head">
                    <strong>{docs.find((item) => item.id === docId)?.name ?? "Documento"}</strong>
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
              <SectionHeader title="Workflows" description="Un solo proceso bien explicado vale más que diez diagramas ruidosos." />
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
              </section>
            </>
          )}

          {view === "results" && (
            <>
              <SectionHeader title="Resultados" description="La pantalla sigue existiendo, pero sin dashboards falsos. Solo métricas que luego sí podremos calcular." />
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
              {filteredViews.map((item) => (
                <button key={item.key} onClick={() => navigate(item.key)}>{item.label}</button>
              ))}
              <small>Proyectos</small>
              {filteredProjects.slice(0, 4).map((item) => (
                <button key={item.id} onClick={() => navigate("projects")}>{item.name}</button>
              ))}
              <small>Misiones</small>
              {filteredMissions.slice(0, 4).map((item) => (
                <button key={item.id} onClick={() => navigate("missions")}>{item.title}</button>
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
