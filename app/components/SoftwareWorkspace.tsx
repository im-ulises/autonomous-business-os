"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCircle2, ChevronDown,
  ChevronUp, Circle, ClipboardList, Code2, ExternalLink, FileCode2, Flag, FolderKanban,
  GitBranch, Layers3, ListChecks, Plus, Search, ShieldAlert, Sparkles, Trash2, X,
} from "lucide-react";
import type {
  Client, Company, SoftwareMilestone, SoftwarePhase, SoftwarePhaseStatus,
  SoftwareProject, SoftwareProjectStatus,
} from "@/lib/types";

type Props = {
  company: Company;
  projects: SoftwareProject[];
  clients: Client[];
  onCreate: (project: SoftwareProject) => void;
  onUpdate: (id: string, patch: Partial<SoftwareProject>) => void;
};

const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const PROJECT_STATES: { key: SoftwareProjectStatus; name: string; description: string }[] = [
  { key: "planning", name: "Planeación", description: "Por definir o estimar" },
  { key: "building", name: "En desarrollo", description: "Trabajo activo" },
  { key: "at_risk", name: "En riesgo", description: "Requiere atención" },
  { key: "paused", name: "En pausa", description: "Detenido temporalmente" },
  { key: "delivered", name: "Entregado", description: "Desarrollo concluido" },
];
const PHASE_STATES: { key: SoftwarePhaseStatus; name: string }[] = [
  { key: "pending", name: "Pendiente" },
  { key: "active", name: "En curso" },
  { key: "review", name: "En revisión" },
  { key: "blocked", name: "Bloqueada" },
  { key: "done", name: "Completada" },
];
const GENERIC_PHASES = [
  "Descubrimiento y requisitos", "Arquitectura y diseño", "Desarrollo",
  "Pruebas y validación", "Despliegue", "Operación y soporte",
];
function phaseDraft(title: string): SoftwarePhase {
  return { id: id(), title, description: "", status: "pending", milestones: [], notes: "" };
}
function safeLink(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch { return ""; }
}
function progress(project: SoftwareProject) {
  const total = project.phases.length;
  const phasesDone = project.phases.filter(phase => phase.status === "done").length;
  const milestones = project.phases.flatMap(phase => phase.milestones);
  const milestonesDone = milestones.filter(milestone => milestone.done).length;
  return {
    phasesDone, total, milestonesDone, milestoneTotal: milestones.length,
    percent: total ? Math.round(100 * phasesDone / total) : 0,
  };
}
function StatePill({ status }: { status: SoftwareProjectStatus }) {
  return <span className={"sw-state sw-state-" + status}><span className="sw-dot"/>{PROJECT_STATES.find(item => item.key === status)?.name ?? status}</span>;
}
function PhasePill({ status }: { status: SoftwarePhaseStatus }) {
  return <span className={"sw-phase-pill sw-phase-" + status}><span className="sw-dot"/>{PHASE_STATES.find(item => item.key === status)?.name ?? status}</span>;
}
function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="sw-field"><span>{label}</span>{children}</label>;
}

export function SoftwareWorkspace({ company, projects, clients, onCreate, onUpdate }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "", owner: "", clientId: "", startDate: "", targetDate: "", template: false });
  const [filter, setFilter] = useState<SoftwareProjectStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [openPhaseId, setOpenPhaseId] = useState<string | null>(null);
  const [phaseTitle, setPhaseTitle] = useState("");
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({});
  const [addingPhase, setAddingPhase] = useState(false);

  const current = projects.find(project => project.id === selectedId) ?? null;
  const currentClient = current ? clients.find(client => client.id === current.clientId) : undefined;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter(project =>
      (filter === "all" || project.status === filter) &&
      (!q || [project.name, project.description, project.owner, clients.find(client => client.id === project.clientId)?.name ?? ""].join(" ").toLowerCase().includes(q))
    ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [projects, clients, filter, query]);
  const activeCount = projects.filter(project => project.status === "building").length;
  const atRiskCount = projects.filter(project => project.status === "at_risk" || project.phases.some(phase => phase.status === "blocked")).length;
  const totalMilestones = projects.reduce((total, project) => total + project.phases.flatMap(phase => phase.milestones).length, 0);
  const completeMilestones = projects.reduce((total, project) => total + project.phases.flatMap(phase => phase.milestones).filter(milestone => milestone.done).length, 0);

  function create(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    const project: SoftwareProject = {
      id: id(), companyId: company.id, name: draft.name.trim(),
      description: draft.description.trim(), owner: draft.owner.trim(),
      clientId: draft.clientId, startDate: draft.startDate, targetDate: draft.targetDate,
      status: "planning", phases: draft.template ? GENERIC_PHASES.map(phaseDraft) : [],
      stack: "", repoUrl: "", specUrl: "", nextAction: "", notes: "",
      createdAt: now, updatedAt: now,
    };
    onCreate(project);
    setDraft({ name: "", description: "", owner: "", clientId: "", startDate: "", targetDate: "", template: false });
    setSelectedId(project.id);
    setCreating(false);
    setOpenPhaseId(project.phases[0]?.id ?? null);
  }
  function patchPhase(phaseId: string, update: Partial<SoftwarePhase>) {
    if (!current) return;
    onUpdate(current.id, { phases: current.phases.map(phase => phase.id === phaseId ? { ...phase, ...update } : phase) });
  }
  function addPhase(event: FormEvent) {
    event.preventDefault();
    if (!current || !phaseTitle.trim()) return;
    const phase = phaseDraft(phaseTitle.trim());
    onUpdate(current.id, { phases: [...current.phases, phase] });
    setPhaseTitle("");
    setAddingPhase(false);
    setOpenPhaseId(phase.id);
  }
  function movePhase(index: number, direction: -1 | 1) {
    if (!current || index + direction < 0 || index + direction >= current.phases.length) return;
    const phases = [...current.phases];
    const other = phases[index + direction];
    phases[index + direction] = phases[index];
    phases[index] = other;
    onUpdate(current.id, { phases });
  }
  function removePhase(phaseId: string) {
    if (!current) return;
    const phase = current.phases.find(item => item.id === phaseId);
    if (!phase || !window.confirm('¿Eliminar la fase "' + phase.title + '" y sus hitos?')) return;
    onUpdate(current.id, { phases: current.phases.filter(item => item.id !== phaseId) });
    if (openPhaseId === phaseId) setOpenPhaseId(null);
  }
  function addMilestone(event: FormEvent, phase: SoftwarePhase) {
    event.preventDefault();
    const title = (milestoneDrafts[phase.id] ?? "").trim();
    if (!title) return;
    const next: SoftwareMilestone = { id: id(), title, deliverable: "", dueDate: "", done: false };
    patchPhase(phase.id, { milestones: [...phase.milestones, next] });
    setMilestoneDrafts(current => ({ ...current, [phase.id]: "" }));
  }
  function patchMilestone(phase: SoftwarePhase, milestoneId: string, data: Partial<SoftwareMilestone>) {
    patchPhase(phase.id, { milestones: phase.milestones.map(item => item.id === milestoneId ? { ...item, ...data } : item) });
  }
  function removeMilestone(phase: SoftwarePhase, milestoneId: string) {
    patchPhase(phase.id, { milestones: phase.milestones.filter(item => item.id !== milestoneId) });
  }

  if (current) {
    const p = progress(current);
    const currentPhase = current.phases.find(phase => phase.status === "active" || phase.status === "review" || phase.status === "blocked");
    return <div className="sw-root">
      <div className="sw-breadcrumb">
        <button onClick={() => { setSelectedId(null); setAddingPhase(false); }}>Software</button>
        <span>/</span><strong>{current.name}</strong>
      </div>
      <div className="sw-detail-hero">
        <div className="sw-detail-top">
          <button className="sw-back" onClick={() => setSelectedId(null)}><ArrowLeft size={16}/> Portafolio de software</button>
          <span className="sw-local-tag">Guardado en este navegador</span>
        </div>
        <div className="sw-detail-heading">
          <div className="sw-product-mark"><Code2 size={23}/></div>
          <div><span>PROYECTO DE SOFTWARE · {company.name.toUpperCase()}</span><h1>{current.name}</h1><p>{current.description || "Añade una descripción del producto y su objetivo."}</p></div>
        </div>
        <div className="sw-detail-metrics">
          <div><strong>{p.percent}%</strong><span>Fases completas</span></div>
          <div><strong>{p.phasesDone}/{p.total}</strong><span>Fases</span></div>
          <div><strong>{p.milestonesDone}/{p.milestoneTotal}</strong><span>Hitos terminados</span></div>
          <div><strong>{currentPhase?.title || "Por definir"}</strong><span>Fase actual</span></div>
        </div>
        <div className="sw-progress-track"><div style={{ width: p.percent + "%" }}/></div>
      </div>

      <div className="sw-detail-grid">
        <div className="sw-detail-main">
          <section className="sw-panel sw-phases-panel">
            <div className="sw-panel-head"><div><span className="sw-overline">ROADMAP DE DESARROLLO</span><h2>Fases y entregables</h2><p>Configura las etapas específicas del software, sus hitos y evidencia.</p></div><button onClick={() => setAddingPhase(value => !value)} className="sw-outline"><Plus size={15}/> Agregar fase</button></div>
            {current.phases.length === 0 ? <div className="sw-no-phases"><Layers3 size={24}/><h3>Aún no hay fases definidas</h3><p>Cuando incorporemos el documento de BOSUR, aquí quedarán sus etapas exactas, dependencias y entregables. Para cualquier otro proyecto puedes construirlas manualmente.</p><button onClick={() => setAddingPhase(true)}>Definir primera fase <Plus size={14}/></button></div> :
              <div className="sw-phase-list">{current.phases.map((phase, index) => {
                const phaseOpen = openPhaseId === phase.id;
                const complete = phase.milestones.filter(milestone => milestone.done).length;
                return <article key={phase.id} className={"sw-phase-card" + (phaseOpen ? " is-open" : "")}>
                  <div className="sw-phase-card-top">
                    <span className={"sw-phase-number sw-phase-number-" + phase.status}>{String(index + 1).padStart(2, "0")}</span>
                    <button className="sw-phase-trigger" onClick={() => setOpenPhaseId(phaseOpen ? null : phase.id)} aria-expanded={phaseOpen}>
                      <span className="sw-phase-trigger-title">{phase.title}</span>
                      <small>{complete}/{phase.milestones.length} hitos completados</small>
                    </button>
                    <PhasePill status={phase.status}/>
                    <button className="sw-icon-button" aria-label={phaseOpen ? "Contraer fase" : "Expandir fase"} onClick={() => setOpenPhaseId(phaseOpen ? null : phase.id)}>{phaseOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
                  </div>
                  {phaseOpen && <div className="sw-phase-content">
                    <div className="sw-phase-edit-row">
                      <MetaField label="Nombre de la fase"><input value={phase.title} onChange={event => patchPhase(phase.id, { title: event.target.value })}/></MetaField>
                      <MetaField label="Estado de la fase"><select className={"sw-phase-select sw-phase-" + phase.status} value={phase.status} onChange={event => patchPhase(phase.id, { status: event.target.value as SoftwarePhaseStatus })}>{PHASE_STATES.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</select></MetaField>
                    </div>
                    <MetaField label="Objetivo y alcance de esta fase"><textarea rows={2} placeholder="Qué incluye esta fase, sus condiciones y dependencias..." value={phase.description} onChange={event => patchPhase(phase.id, { description: event.target.value })}/></MetaField>
                    <div className="sw-milestone-heading"><h3>Hitos y entregables</h3><span>{complete} de {phase.milestones.length} listos</span></div>
                    <div className="sw-milestone-list">
                      {phase.milestones.map(milestone => <div key={milestone.id} className="sw-milestone">
                        <button aria-label={milestone.done ? "Marcar como pendiente" : "Marcar como completado"} onClick={() => patchMilestone(phase, milestone.id, { done: !milestone.done })}>{milestone.done ? <CheckCircle2 size={18}/> : <Circle size={18}/>}</button>
                        <div className="sw-milestone-fields">
                          <input className={milestone.done ? "is-complete" : ""} value={milestone.title} aria-label="Nombre del hito" maxLength={160} onChange={event => patchMilestone(phase, milestone.id, { title: event.target.value })}/>
                          <input value={milestone.deliverable} aria-label="Entregable o evidencia del hito" maxLength={250} placeholder="Entregable, evidencia o condición de aceptación..." onChange={event => patchMilestone(phase, milestone.id, { deliverable: event.target.value })}/>
                        </div>
                        <button className="sw-milestone-remove" aria-label={"Eliminar hito " + milestone.title} onClick={() => removeMilestone(phase, milestone.id)}><Trash2 size={14}/></button>
                      </div>)}
                      {phase.milestones.length === 0 && <p className="sw-muted">Agrega hitos concretos para medir avances reales de esta fase.</p>}
                    </div>
                    <form className="sw-milestone-add" onSubmit={event => addMilestone(event, phase)}><input aria-label="Nuevo hito" value={milestoneDrafts[phase.id] ?? ""} onChange={event => setMilestoneDrafts(current => ({ ...current, [phase.id]: event.target.value }))} placeholder="Nuevo hito o entregable..." maxLength={160}/><button type="submit" disabled={!(milestoneDrafts[phase.id] ?? "").trim()}><Plus size={14}/> Añadir</button></form>
                    <MetaField label="Notas y dependencias de esta fase"><textarea rows={2} value={phase.notes} onChange={event => patchPhase(phase.id, { notes: event.target.value })} placeholder="Bloqueos, decisiones, revisión, dependencias..."/></MetaField>
                    <div className="sw-phase-actions"><button disabled={index === 0} onClick={() => movePhase(index,-1)}><ChevronUp size={14}/> Subir fase</button><button disabled={index === current.phases.length-1} onClick={() => movePhase(index,1)}><ChevronDown size={14}/> Bajar fase</button><button className="sw-danger-action" onClick={() => removePhase(phase.id)}><Trash2 size={14}/> Eliminar fase</button></div>
                  </div>}
                </article>;
              })}</div>
            }
            {addingPhase && <form className="sw-add-phase-form" onSubmit={addPhase}>
              <label className="sw-field"><span>Nueva fase</span><input autoFocus value={phaseTitle} onChange={event => setPhaseTitle(event.target.value)} maxLength={110} placeholder="Ej. Validación funcional, Piloto, Entrega..."/></label>
              <div><button type="button" className="sw-outline" onClick={() => { setAddingPhase(false); setPhaseTitle(""); }}>Cancelar</button><button type="submit" disabled={!phaseTitle.trim()} className="sw-action">Agregar fase <Plus size={14}/></button></div>
            </form>}
          </section>
          <section className="sw-panel">
            <div className="sw-panel-head"><div><span className="sw-overline">SEGUIMIENTO</span><h2>Últimos acuerdos y contexto</h2><p>Notas editables para continuar donde quedó el equipo.</p></div></div>
            <MetaField label="Notas de proyecto"><textarea value={current.notes} onChange={event => onUpdate(current.id, { notes: event.target.value })} rows={5} placeholder="Última reunión, decisiones, blockers, cambios de alcance..."/></MetaField>
          </section>
        </div>

        <aside className="sw-detail-side">
          <section className="sw-panel">
            <div className="sw-panel-head"><div><span className="sw-overline">SALUD DEL PROYECTO</span><h2>Control y seguimiento</h2></div></div>
            <MetaField label="Estado global"><select className={"sw-state-select sw-state-" + current.status} value={current.status} onChange={event => onUpdate(current.id, { status: event.target.value as SoftwareProjectStatus })}>{PROJECT_STATES.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</select></MetaField>
            <MetaField label="Siguiente acción prioritaria"><textarea rows={3} placeholder="Qué debe hacerse ahora y por quién..." value={current.nextAction} onChange={event => onUpdate(current.id, { nextAction: event.target.value })}/></MetaField>
            <div className="sw-side-dates">
              <MetaField label="Fecha de inicio"><input type="date" value={current.startDate} onChange={event => onUpdate(current.id, { startDate: event.target.value })}/></MetaField>
              <MetaField label="Fecha objetivo"><input type="date" value={current.targetDate} onChange={event => onUpdate(current.id, { targetDate: event.target.value })}/></MetaField>
            </div>
            <MetaField label="Responsable"><input placeholder="Persona o equipo" maxLength={120} value={current.owner} onChange={event => onUpdate(current.id, { owner: event.target.value })}/></MetaField>
          </section>
          <section className="sw-panel">
            <div className="sw-panel-head"><div><span className="sw-overline">DEFINICIÓN DEL PRODUCTO</span><h2>Ficha técnica</h2></div></div>
            <MetaField label="Descripción"><textarea rows={3} value={current.description} onChange={event => onUpdate(current.id, { description: event.target.value })}/></MetaField>
            <MetaField label="Cliente vinculado"><select value={current.clientId} onChange={event => onUpdate(current.id, { clientId: event.target.value })}><option value="">Sin cliente</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></MetaField>
            {currentClient && <div className="sw-client-preview"><span style={{ background: currentClient.brandColor }}>{currentClient.name.slice(0,2).toUpperCase()}</span><div><strong>{currentClient.name}</strong><small>{currentClient.industry || "Cliente registrado"}</small></div></div>}
            <MetaField label="Stack tecnológico"><input placeholder="Ej. Next.js, PostgreSQL, Cloudflare..." value={current.stack} onChange={event => onUpdate(current.id, { stack: event.target.value })}/></MetaField>
            <MetaField label="Repositorio"><input type="url" placeholder="https://github.com/..." value={current.repoUrl} onChange={event => onUpdate(current.id, { repoUrl: event.target.value })}/></MetaField>
            {safeLink(current.repoUrl) && <a className="sw-resource-link" href={safeLink(current.repoUrl)} rel="noopener noreferrer" target="_blank"><GitBranch size={15}/> Abrir repositorio <ExternalLink size={13}/></a>}
            <MetaField label="Especificación o documento de etapas"><input type="url" placeholder="https://..." value={current.specUrl} onChange={event => onUpdate(current.id, { specUrl: event.target.value })}/></MetaField>
            {safeLink(current.specUrl) && <a className="sw-resource-link" href={safeLink(current.specUrl)} rel="noopener noreferrer" target="_blank"><FileCode2 size={15}/> Abrir especificación <ExternalLink size={13}/></a>}
          </section>
          <p className="sw-local-notice"><ShieldAlert size={16}/> Avances registrados manualmente en este navegador. No son estados verificados por GitHub, Railway, Crobi ni un gestor externo.</p>
        </aside>
      </div>
    </div>;
  }

  return <div className="sw-root">
    <header className="sw-portfolio-header">
      <div><span className="sw-overline">EVO STUDIOS / PRODUCT & ENGINEERING</span><h1>Software</h1><p>Desarrollos de largo plazo con sus propias etapas, entregables y seguimiento. Separados del trabajo audiovisual y de sitios web.</p></div>
      <button className="sw-action" onClick={() => setCreating(value => !value)}>{creating ? <X size={16}/> : <Plus size={16}/>}{creating ? "Cerrar" : "Nuevo software"}</button>
    </header>
    <section className="sw-summary-metrics" aria-label="Resumen del portafolio de software">
      <div><span>Proyectos de software</span><strong>{projects.length}</strong><small>Portafolio independiente</small></div>
      <div><span>En desarrollo</span><strong>{activeCount}</strong><small>Construcción activa</small></div>
      <div><span>Requieren atención</span><strong>{atRiskCount}</strong><small>Riesgo o fases bloqueadas</small></div>
      <div><span>Hitos terminados</span><strong>{completeMilestones}<em> / {totalMilestones}</em></strong><small>Avances marcados</small></div>
    </section>
    {creating && <form className="sw-create-panel" onSubmit={create}>
      <div className="sw-create-heading"><div><h2>Nuevo proyecto de software</h2><p>Empieza desde cero o usa fases genéricas editables. Las etapas específicas de BOSUR se cargarán cuando tengamos el documento.</p></div></div>
      <div className="sw-create-grid">
        <MetaField label="Nombre del producto *"><input required autoFocus maxLength={120} value={draft.name} placeholder="Ej. BOSUR Operations" onChange={event => setDraft({ ...draft, name: event.target.value })}/></MetaField>
        <MetaField label="Cliente"><select value={draft.clientId} onChange={event => setDraft({ ...draft, clientId: event.target.value })}><option value="">Sin vincular</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></MetaField>
        <MetaField label="Descripción"><textarea rows={2} maxLength={500} value={draft.description} placeholder="Producto, problema y resultado esperado" onChange={event => setDraft({ ...draft, description: event.target.value })}/></MetaField>
        <MetaField label="Responsable"><input maxLength={120} value={draft.owner} placeholder="Persona o equipo" onChange={event => setDraft({ ...draft, owner: event.target.value })}/></MetaField>
        <MetaField label="Inicio"><input type="date" value={draft.startDate} onChange={event => setDraft({ ...draft, startDate: event.target.value })}/></MetaField>
        <MetaField label="Fecha objetivo"><input type="date" value={draft.targetDate} onChange={event => setDraft({ ...draft, targetDate: event.target.value })}/></MetaField>
      </div>
      <label className="sw-template-choice"><input type="checkbox" checked={draft.template} onChange={event => setDraft({ ...draft, template: event.target.checked })}/><span><strong>Crear con fases genéricas editables</strong><small>Descubrimiento, arquitectura, desarrollo, pruebas, despliegue y soporte. No equivale a las fases de BOSUR.</small></span></label>
      <div className="sw-form-actions"><button type="button" className="sw-outline" onClick={() => setCreating(false)}>Cancelar</button><button type="submit" className="sw-action" disabled={!draft.name.trim()}>Crear proyecto <ArrowRight size={14}/></button></div>
    </form>}

    <div className="sw-portfolio-toolbar"><div><h2>Portafolio de desarrollo</h2><p>{projects.length} {projects.length === 1 ? "software registrado" : "softwares registrados"}</p></div><div className="sw-portfolio-filters"><label className="sw-search"><Search size={15}/><input aria-label="Buscar software" value={query} placeholder="Buscar software..." onChange={event => setQuery(event.target.value)}/></label><select aria-label="Filtrar estado" value={filter} onChange={event => setFilter(event.target.value as SoftwareProjectStatus | "all")}><option value="all">Todos los estados</option>{PROJECT_STATES.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</select></div></div>
    {projects.length === 0 ? <section className="sw-empty">
      <span className="sw-empty-symbol"><Layers3 size={29}/></span>
      <span className="sw-overline">PORTAFOLIO LISTO</span>
      <h2>Una forma distinta de gestionar software</h2>
      <p>Sin mezclarlo con videos ni sitios web. Cada producto tendrá un roadmap de fases, hitos, dependencias, entregables y una ficha técnica propia.</p>
      <div className="sw-next-project"><Flag size={17}/><span><strong>Próximo proyecto a incorporar: BOSUR</strong><small>Etapas y alcance pendientes del documento que compartirás. Aún no se ha creado su ficha para evitar supuestos.</small></span></div>
      <button onClick={() => setCreating(true)}>Crear proyecto de software <Plus size={15}/></button>
    </section> : filtered.length ? <div className="sw-portfolio-grid">{filtered.map(project => {
      const p = progress(project);
      const next = project.phases.find(phase => phase.status === "active" || phase.status === "blocked" || phase.status === "review") ?? project.phases.find(phase => phase.status === "pending");
      const linked = clients.find(client => client.id === project.clientId);
      return <button className="sw-project-card" type="button" key={project.id} onClick={() => { setSelectedId(project.id); setOpenPhaseId(next?.id ?? null); }}>
        <div className="sw-project-card-head"><span className="sw-project-symbol"><Code2 size={19}/></span><StatePill status={project.status}/></div>
        <span className="sw-project-client">{linked?.name || company.name}</span>
        <h3>{project.name}</h3>
        <p>{project.description || "Sin descripción todavía"}</p>
        <div className="sw-project-card-progress"><div><span>Fases completadas</span><strong>{p.percent}%</strong></div><div className="sw-progress-track"><div style={{ width: p.percent + "%" }}/></div></div>
        <div className="sw-project-card-phase"><Flag size={14}/><span>{next?.title || (project.phases.length ? "Todas las fases revisadas" : "Definir roadmap")}</span></div>
        <div className="sw-project-card-footer"><span><CalendarDays size={13}/>{project.targetDate || "Sin fecha objetivo"}</span><strong>Abrir proyecto <ArrowUpRight size={14}/></strong></div>
      </button>;
    })}</div> : <section className="sw-filter-empty"><Search size={23}/><h3>Sin resultados</h3><p>Prueba otro nombre o estado.</p><button onClick={() => {setFilter("all");setQuery("");}}>Limpiar filtros</button></section>}
    <p className="sw-footnote">Los proyectos de software se guardan en un portafolio distinto. Por ahora la información persiste solo en el navegador hasta conectar el backend.</p>
  </div>;
}
