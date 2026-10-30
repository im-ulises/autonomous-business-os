"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Activity, ArrowRight, BookOpenText, Bot, BriefcaseBusiness, CheckCheck,
  ChevronDown, CircleHelp, Command, FileText, FolderKanban, GitBranch,
  Layers3, LayoutDashboard, Menu, Network, Plus, Search, ShieldCheck,
  Sparkles, Workflow, X
} from "lucide-react";

type Section = "Ahora" | "Empresas" | "Departamentos" | "Proyectos" | "Misiones" | "Docs" | "Workflows" | "Resultados" | "Sistema";
type Company = { id: string; name: string; initials: string; description: string };
type Project = { id: string; companyId: string; name: string; description: string; status: "Planificación" | "Activo" | "En espera" };
type Mission = { id: string; companyId: string; projectId?: string; title: string; outcome: string; status: "Borrador" | "Planificada" };
type Saved = { companies: Company[]; projects: Project[]; missions: Mission[] };
type DocId = "overview" | "engineering" | "knowledge-contract";

const STORAGE = "autonomous-business-os-demo-v1";
const initial: Saved = {
  companies: [{ id: "demo", name: "Empresa de demostración", initials: "DM", description: "Workspace de ejemplo, sin conexión a agentes reales" }],
  projects: [{ id: "demo-project", companyId: "demo", name: "Sitio web de ejemplo", description: "Diseño y mantenimiento", status: "Planificación" }],
  missions: [{ id: "demo-mission", companyId: "demo", projectId: "demo-project", title: "Preparar propuesta de cambios", outcome: "Pull request verificable", status: "Borrador" }],
};

const sidebar: { title: Section; icon: typeof LayoutDashboard }[] = [
  { title: "Ahora", icon: LayoutDashboard },
  { title: "Empresas", icon: BriefcaseBusiness },
  { title: "Departamentos", icon: Network },
  { title: "Proyectos", icon: FolderKanban },
  { title: "Misiones", icon: Bot },
  { title: "Docs", icon: BookOpenText },
  { title: "Workflows", icon: Workflow },
  { title: "Resultados", icon: Activity },
  { title: "Sistema", icon: Layers3 },
];

const departments = [
  { name: "Dirección", description: "Objetivos, estrategia y supervisión" },
  { name: "Ingeniería", description: "Desarrollo, calidad y mantenimiento" },
  { name: "Marketing", description: "Campañas, creatividad y distribución" },
  { name: "Ventas", description: "Prospectos, propuestas y seguimiento" },
  { name: "Operaciones", description: "Procesos, proveedores y entregas" },
  { name: "Finanzas", description: "Presupuestos, resultados y control" },
];

const documents: { id: DocId; title: string; category: string }[] = [
  { id: "overview", title: "Business OS — Overview", category: "Fundamentos" },
  { id: "engineering", title: "Engineering — Playbook", category: "Procesos" },
  { id: "knowledge-contract", title: "Contrato de conocimiento", category: "Arquitectura" },
];

function generateId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
}

export function OperatingConsole() {
  const [section, setSection] = useState<Section>("Ahora");
  const [saved, setSaved] = useState<Saved>(initial);
  const [companyId, setCompanyId] = useState("demo");
  const [hydrated, setHydrated] = useState(false);
  const [docId, setDocId] = useState<DocId>("overview");
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState({ configured: false, connected: false, label: "Sin verificar" });
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE);
      if (raw) {
        const parsed: Saved = JSON.parse(raw);
        if (Array.isArray(parsed.companies) && Array.isArray(parsed.projects) && Array.isArray(parsed.missions)) {
          setSaved(parsed);
          setCompanyId(parsed.companies[0]?.id || "demo");
        }
      }
    } catch { /* Invalid local sample data: safely use demo defaults. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE, JSON.stringify(saved));
  }, [saved, hydrated]);

  useEffect(() => {
    let active = true;
    fetch("/api/docs?id=" + encodeURIComponent(docId), { cache: "no-store" })
      .then((r) => { if (!r.ok) throw Error("Document unavailable"); return r.json(); })
      .then((d: { source: string }) => { if (active) setMarkdown(d.source); })
      .catch(() => { if (active) setMarkdown("# Documento no disponible"); });
    return () => { active = false; };
  }, [docId]);

  useEffect(() => {
    fetch("/api/crobi/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((r: { configured: boolean; connected: boolean; label: string }) => setStatus(r))
      .catch(() => setStatus({ configured: false, connected: false, label: "Sin verificar" }));
  }, []);

  const selectedCompany = saved.companies.find((c) => c.id === companyId) || saved.companies[0];
  const projects = useMemo(() => saved.projects.filter((p) => p.companyId === companyId), [saved.projects, companyId]);
  const missions = useMemo(() => saved.missions.filter((m) => m.companyId === companyId), [saved.missions, companyId]);

  function createCompany() {
    const name = window.prompt("Nombre de la empresa");
    if (!name?.trim()) return;
    const id = generateId();
    setSaved((current) => ({
      ...current,
      companies: [...current.companies, { id, name: name.trim(), initials: name.trim().slice(0, 2).toUpperCase(), description: "Nuevo workspace local" }],
    }));
    setCompanyId(id);
    setSection("Empresas");
  }
  function createProject() {
    const name = window.prompt("Nombre del proyecto");
    if (!name?.trim()) return;
    setSaved((current) => ({
      ...current,
      projects: [...current.projects, { id: generateId(), companyId, name: name.trim(), description: "Borrador local", status: "Planificación" }],
    }));
    setSection("Proyectos");
  }
  function createMission() {
    const title = window.prompt("¿Qué resultado necesitas?");
    if (!title?.trim()) return;
    setSaved((current) => ({
      ...current,
      missions: [...current.missions, { id: generateId(), companyId, title: title.trim(), outcome: "Por definir", status: "Borrador" }],
    }));
    setSection("Misiones");
  }
  function changeProject(id: string) {
    setSaved((current) => ({
      ...current,
      projects: current.projects.map((p) => p.id !== id ? p : ({ ...p, status: p.status === "Planificación" ? "Activo" : p.status === "Activo" ? "En espera" : "Planificación" })),
    }));
  }

  const visibleNav = sidebar.filter((item) => item.title.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="shell">
      <aside className={"sidebar " + (menuOpen ? "sidebar-open" : "")}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={18}/></div>
          <div><strong>Autonomous</strong><small>BUSINESS OS</small></div>
          <button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X size={18}/></button>
        </div>
        <button className="workspace" onClick={() => setSection("Empresas")}>
          <span className="workspace-avatar">{selectedCompany?.initials || "OS"}</span>
          <span><strong>{selectedCompany?.name || "Mi empresa"}</strong><small>Workspace de demostración</small></span>
          <ChevronDown size={15}/>
        </button>
        <div className="sidebar-caption">NAVEGACIÓN</div>
        <nav className="nav" aria-label="Navegación principal">
          {visibleNav.map(({ title, icon: Icon }) =>
            <button key={title} className={"nav-item " + (section === title ? "nav-active" : "")}
              onClick={() => { setSection(title); setMenuOpen(false); }}>
              <Icon size={17}/><span>{title}</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-caption">EJECUTOR</div>
          <div className="system-row"><span className={"status-dot " + (status.connected ? "online" : "")}/><span>Crobi: {status.label}</span></div>
          <div className="side-footnote">Sin ejecuciones autónomas activas.</div>
        </div>
      </aside>
      {menuOpen && <button className="mobile-overlay" aria-label="Cerrar navegación" onClick={() => setMenuOpen(false)}/>}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-toggle" aria-label="Abrir navegación" onClick={() => setMenuOpen(true)}><Menu size={20}/></button>
            <span className="crumb">Workspace</span><span className="slash">/</span><strong>{section}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-tag"><span className="status-dot"/ > MODO DEMO</span>
            <button className="icon-button" title="Buscar secciones" onClick={() => { const el = document.getElementById("nav-search"); el?.focus(); }}><Search size={18}/></button>
            <span className="user-avatar">U</span>
          </div>
        </header>
        <div className="main-content">
          <div className="eyebrow">AUTONOMOUS BUSINESS OS / V0.1</div>
          <div className="page-heading">
            <div>
              <h1>{section === "Ahora" ? "Tu empresa. Bajo control." : section}</h1>
              <p className="subtitle">{section === "Ahora" ? "Supervisa resultados, decisiones y misiones desde un solo lugar." : "Espacio de trabajo de demostración. Los cambios se guardan solo en este navegador."}</p>
            </div>
            {(section === "Empresas" || section === "Proyectos" || section === "Misiones") &&
              <button className="primary-button" onClick={section === "Empresas" ? createCompany : section === "Proyectos" ? createProject : createMission}><Plus size={16}/> Crear {section === "Empresas" ? "empresa" : section === "Proyectos" ? "proyecto" : "misión"}</button>}
          </div>
          <div className="notice"><ShieldCheck size={17}/><span>**Versión de demostración.** No hay agentes ejecutando tareas, información bancaria ni decisiones reales conectadas.</span></div>

          {section === "Ahora" && <>
            <div className="metric-grid">
              <div className="metric-card"><small>Decisiones pendientes de Crobi</small><strong>—</strong><span>Sin conexión a aprobaciones reales</span></div>
              <div className="metric-card"><small>Misiones locales</small><strong>{missions.length}</strong><span>Solo borradores y planes</span></div>
              <div className="metric-card"><small>Proyectos</small><strong>{projects.length}</strong><span>En este workspace</span></div>
            </div>
            <div className="two-column">
              <section className="panel">
                <div className="panel-heading"><div><h2>Requiere tu atención</h2><p>Las aprobaciones reales aparecerán al conectar Crobi.</p></div><CheckCheck size={18}/></div>
                <div className="empty-state"><ShieldCheck size={24}/><strong>No hay decisiones conectadas</strong><span>Por seguridad, no inventamos aprobaciones ni actividad de agentes.</span></div>
              </section>
              <section className="panel">
                <div className="panel-heading"><div><h2>Misiones de trabajo</h2><p>Borradores de ejemplo para organizar objetivos.</p></div><Bot size={18}/></div>
                {missions.map((mission) => <div className="list-row" key={mission.id}><span className="list-icon"><Bot size={16}/></span><span className="list-main"><strong>{mission.title}</strong><small>{mission.outcome}</small></span><span className="pill">{mission.status}</span></div>)}
                <button className="text-button" onClick={() => setSection("Misiones")}>Ver todas las misiones <ArrowRight size={15}/></button>
              </section>
            </div>
            <section className="command-card">
              <div className="command-orb"><Command size={24}/></div>
              <div><h2>Tu centro de mando</h2><p>Aquí podrás pedir resultados a los departamentos digitales. La ejecución llegará cuando conectemos Crobi con autorización.</p></div>
              <button className="secondary-button" onClick={createMission}>Preparar misión <ArrowRight size={15}/></button>
            </section>
          </>}

          {section === "Empresas" && <div className="item-grid">
            {saved.companies.map((c) => <button className={"tile company-tile " + (companyId === c.id ? "tile-selected" : "")} key={c.id} onClick={() => setCompanyId(c.id)}>
              <span className="large-avatar">{c.initials}</span><h3>{c.name}</h3><p>{c.description}</p><span className="tile-bottom">{companyId === c.id ? "Workspace actual" : "Cambiar a empresa"} <ArrowRight size={15}/></span>
            </button>)}
          </div>}

          {section === "Departamentos" && <>
            <div className="section-intro">Equipos profesionales propuestos. No son agentes activos: su conexión con Crobi se implementará en otra fase.</div>
            <div className="item-grid">{departments.map((d) => <div className="tile" key={d.name}><span className="tile-icon"><Network size={19}/></span><h3>{d.name}</h3><p>{d.description}</p><span className="pill">Por conectar</span></div>)}</div>
          </>}

          {section === "Proyectos" && <section className="panel">
            <div className="panel-heading"><h2>Proyectos de {selectedCompany?.name}</h2><span className="count-label">{projects.length} en total</span></div>
            {projects.length === 0 && <div className="empty-state">No tienes proyectos locales. Crea el primero.</div>}
            {projects.map((p) => <div className="list-row" key={p.id}><span className="list-icon"><FolderKanban size={16}/></span><span className="list-main"><strong>{p.name}</strong><small>{p.description}</small></span><button className="pill pill-button" onClick={() => changeProject(p.id)} title="Cambiar etapa local">{p.status}</button></div>)}
          </section>}

          {section === "Misiones" && <section className="panel">
            <div className="panel-heading"><div><h2>Misiones</h2><p>Objetivos preparados. Ninguno ha sido enviado a un ejecutor.</p></div><span className="count-label">{missions.length}</span></div>
            {missions.length === 0 && <div className="empty-state">No hay misiones creadas.</div>}
            {missions.map((m) => <div className="list-row" key={m.id}><span className="list-icon"><GitBranch size={16}/></span><span className="list-main"><strong>{m.title}</strong><small>{m.outcome}</small></span><span className="pill">{m.status}</span></div>)}
          </section>}

          {section === "Docs" && <section className="docs-layout">
            <div className="docs-sidebar"><div className="sidebar-caption">DOCUMENTOS MARKDOWN</div>{documents.map((d) => <button key={d.id} className={"doc-choice " + (docId === d.id ? "doc-selected" : "")} onClick={() => setDocId(d.id)}><FileText size={16}/><span><strong>{d.title}</strong><small>{d.category}</small></span></button>)}</div>
            <div className="docs-article"><div className="doc-meta"><BookOpenText size={16}/> Git Markdown · Vista de lectura <span className="pill">Demo</span></div><article className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown></article></div>
          </section>}

          {section === "Workflows" && <section className="panel">
            <div className="panel-heading"><h2>Procesos empresariales</h2><Workflow size={18}/></div>
            <div className="flowline"><span className="flow-step">Objetivo</span><ArrowRight size={16}/><span className="flow-step">Contexto</span><ArrowRight size={16}/><span className="flow-step">Crobi Run</span><ArrowRight size={16}/><span className="flow-step">Evidencia</span></div>
            <p className="muted">Esquema del workflow objetivo. Aún no conectado a ejecuciones reales.</p>
          </section>}

          {section === "Resultados" && <section className="panel"><div className="panel-heading"><h2>Resultados verificables</h2><Activity size={18}/></div><div className="empty-state"><CircleHelp size={24}/><strong>Todavía no hay resultados registrados</strong><span>Solo aparecerán resultados vinculados a evidencia real de ejecución.</span></div></section>}

          {section === "Sistema" && <section className="panel"><div className="panel-heading"><h2>Integraciones</h2><ShieldCheck size={18}/></div>
            <div className="list-row"><span className="list-icon"><Bot size={16}/></span><span className="list-main"><strong>Crobi Chief</strong><small>Comprobación de disponibilidad de API únicamente</small></span><span className="pill">{status.label}</span></div>
            <div className="list-row"><span className="list-icon"><BookOpenText size={16}/></span><span className="list-main"><strong>Markdown Docs</strong><small>Lectura local incluida</small></span><span className="pill">Demo</span></div>
            <p className="muted">No hay credenciales ni agentes configurados. Las conexiones reales requieren autorización y gobierno del lado del servidor.</p>
          </section>}
        </div>
        <footer className="footer"><span>Autonomous Business OS · Starter v0.1</span><span>Powered by a future Crobi integration</span></footer>
      </main>
    </div>
  );
}
