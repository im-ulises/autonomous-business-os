"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, ChevronDown, Circle, Clock3, ContactRound, ExternalLink, FolderKanban, GripVertical, LayoutGrid, List, Plus, Search, SlidersHorizontal, Trash2, UserRound, Users, X } from "lucide-react";
import type { Client, Company, Mission, Project, ProjectDetails, ProjectPriority, ProjectTask } from "@/lib/types";

const STAGES: { key: Project["stage"]; name: string; hint: string }[] = [
  { key: "idea", name: "Ideas", hint: "Por definir" },
  { key: "planning", name: "Planeación", hint: "Preparando" },
  { key: "active", name: "En curso", hint: "En ejecución" },
  { key: "waiting", name: "En espera", hint: "Con dependencias" },
  { key: "completed", name: "Finalizado", hint: "Entregado" },
];
const PRIORITIES: { key: ProjectPriority; name: string }[] = [
  { key: "low", name: "Baja" }, { key: "normal", name: "Normal" },
  { key: "high", name: "Alta" }, { key: "critical", name: "Crítica" },
];
const EMPTY_CLIENT: Client = {
  id: "", companyId: "", name: "", description: "", industry: "",
  brandColor: "#8493cb", website: "", contactName: "", contactEmail: "", contactPhone: "",
};
type Props = {
  company?: Company;
  projects: Project[];
  missions: Mission[];
  clients: Client[];
  details: Record<string, ProjectDetails>;
  initialProjectId: string | null;
  onClearInitialProject: () => void;
  onNewProject: () => void;
  onStageChange: (id: string, stage: Project["stage"]) => void;
  onDetailsChange: (id: string, changes: Partial<ProjectDetails>) => void;
  onSaveClient: (client: Client) => void;
  onGoMissions: () => void;
};
const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
function priorityName(key: ProjectPriority) { return PRIORITIES.find(p => p.key === key)?.name ?? "Normal"; }
function stageName(key: Project["stage"]) { return STAGES.find(s => s.key === key)?.name ?? key; }
function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch { return ""; }
}
function Badge({ stage, priority }: { stage?: Project["stage"]; priority?: ProjectPriority }) {
  if (stage) return <span className={"pm-stage pm-stage-" + stage}><span className="pm-dot"/>{stageName(stage)}</span>;
  const level = priority ?? "normal";
  return <span className={"pm-heat pm-heat-" + level}><span className="pm-dot"/>{priorityName(level)}</span>;
}
export function ProjectManager({
  company, projects, missions, clients, details, initialProjectId,
  onClearInitialProject, onNewProject, onStageChange, onDetailsChange, onSaveClient, onGoMissions,
}: Props) {
  const [mode, setMode] = useState<"board" | "list" | "clients">("board");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [heat, setHeat] = useState<ProjectPriority | "all">("all");
  const [clientEditor, setClientEditor] = useState(false);
  const [clientDraft, setClientDraft] = useState<Client>(EMPTY_CLIENT);
  const [taskDraft, setTaskDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [briefDraft, setBriefDraft] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialProjectId && projects.some(project => project.id === initialProjectId)) {
      setSelectedId(initialProjectId);
    }
  }, [initialProjectId, projects]);
  useEffect(() => {
    setSelectedId(current => current && projects.some(project => project.id === current) ? current : null);
  }, [company?.id, projects]);
  const selected = projects.find(project => project.id === selectedId);
  const selectedDetails = selected ? details[selected.id] ?? {} : {};
  const selectedClientId = selected ? selectedDetails.clientId ?? (selected.id === "sample-bigmedia" ? "client-bigmedia" : "") : "";
  const client = clients.find(item => item.id === selectedClientId);
  const projectMissions = selected ? missions.filter(mission => mission.projectId === selected.id) : [];
  const tasks = selectedDetails.tasks ?? [];
  const doneTasks = tasks.filter(task => task.done).length;
  const filtered = useMemo(() => projects.filter(project => {
    const owner = clients.find(item => item.id === (details[project.id]?.clientId ?? (project.id === "sample-bigmedia" ? "client-bigmedia" : "")));
    const match = (project.name + " " + project.description + " " + (owner?.name ?? "")).toLowerCase().includes(query.trim().toLowerCase());
    return match && (heat === "all" || (details[project.id]?.priority ?? "normal") === heat);
  }), [projects, clients, details, query, heat]);
  function showProject(project: Project) {
    setSelectedId(project.id);
    setNoteDraft(details[project.id]?.notes ?? "");
    setBriefDraft(details[project.id]?.brief ?? "");
    setTaskDraft("");
  }
  function closeProject() { setSelectedId(null); onClearInitialProject(); }
  function startClientEdit(value?: Client) {
    setClientDraft(value ? { ...value } : { ...EMPTY_CLIENT, id: id(), companyId: company?.id ?? "" });
    setClientEditor(true);
  }
  function saveClient(event: React.FormEvent) {
    event.preventDefault();
    if (!company || !clientDraft.name.trim()) return;
    const updated = { ...clientDraft, companyId: company.id, name: clientDraft.name.trim(), website: clientDraft.website.trim() };
    onSaveClient(updated);
    if (selected && !selectedClientId) onDetailsChange(selected.id, { clientId: updated.id });
    setClientEditor(false);
  }
  function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !taskDraft.trim()) return;
    onDetailsChange(selected.id, { tasks: [...tasks, { id: id(), title: taskDraft.trim(), done: false }] });
    setTaskDraft("");
  }
  function switchTask(item: ProjectTask) {
    if (selected) onDetailsChange(selected.id, { tasks: tasks.map(task => task.id === item.id ? { ...task, done: !task.done } : task) });
  }
  function removeTask(item: ProjectTask) {
    if (selected) onDetailsChange(selected.id, { tasks: tasks.filter(task => task.id !== item.id) });
  }
  function dropOnStage(event: React.DragEvent<HTMLDivElement>, stage: Project["stage"]) {
    event.preventDefault();
    const projectId = event.dataTransfer.getData("text/plain") || draggedId;
    if (projectId && projects.some(project => project.id === projectId)) onStageChange(projectId, stage);
    setDraggedId(null);
  }
  const availableClients = clients.filter(item => item.companyId === company?.id);
  const orderedProjects = [...filtered].sort((a, b) => {
    const rank: Record<ProjectPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    return rank[details[a.id]?.priority ?? "normal"] - rank[details[b.id]?.priority ?? "normal"];
  });
  const projectCard = (project: Project) => {
    const priority = details[project.id]?.priority ?? "normal";
    const assignedClient = clients.find(item => item.id === (details[project.id]?.clientId ?? (project.id === "sample-bigmedia" ? "client-bigmedia" : "")));
    const related = missions.filter(mission => mission.projectId === project.id);
    return <button
      type="button" draggable
      onDragStart={event => { event.dataTransfer.setData("text/plain", project.id); setDraggedId(project.id); }}
      onDragEnd={() => setDraggedId(null)}
      key={project.id} className={"pm-board-card pm-priority-border-" + priority}
      onClick={() => showProject(project)}
      aria-label={"Abrir proyecto " + project.name}
    >
      <span className="pm-card-top"><span className="pm-card-client"><span className="pm-client-pip" style={{ background: assignedClient?.brandColor ?? "#bab9c3" }}/>{assignedClient?.name ?? company?.name}</span><GripVertical size={13}/></span>
      <strong>{project.name}</strong>
      <small className="pm-card-description">{project.description || "Sin descripción"}</small>
      <span className="pm-card-bottom"><Badge priority={priority}/><span>{related.length} misiones</span></span>
      {details[project.id]?.dueDate && <span className="pm-card-due"><CalendarDays size={12}/>{details[project.id]?.dueDate}</span>}
      {project.demo && <span className="pm-demo-tag">EJEMPLO</span>}
    </button>;
  };

  if (!company) return <div className="pm-empty">Selecciona una empresa para administrar sus proyectos.</div>;
  return <div className="pm-shell">
    {selected && !clientEditor ? <>
      <div className="pm-page-breadcrumb">
        <button onClick={closeProject}>Proyectos</button><span>/</span><strong>{selected.name}</strong>
      </div>
      <div className="pm-project-page">
        <div className="pm-client-banner" style={{ borderTopColor: client?.brandColor ?? company.accent }}>
          <div className="pm-banner-actions">
            <button className="pm-back" onClick={closeProject}><ArrowLeft size={16}/> Todos los proyectos</button>
            <span className="pm-private-tag">{selected.demo ? "Proyecto de ejemplo · " : ""}Gestión local</span>
          </div>
          <div className="pm-project-heading">
            <span className="pm-project-logo" style={{ background: client?.brandColor ?? "#e8e5f4", color: "#fff" }}>{(client?.name ?? company.name).slice(0,2).toUpperCase()}</span>
            <div>
              <span className="pm-eyebrow">{client ? client.name : "Sin cliente vinculado"} · {company.name}</span>
              <h1>{selected.name}</h1>
              <p>{selected.description || "Agrega los detalles del proyecto."}</p>
            </div>
          </div>
          <div className="pm-project-controls">
            <label>Etapa
              <select value={selected.stage} className={"pm-control-stage pm-stage-" + selected.stage} onChange={event => onStageChange(selected.id, event.target.value as Project["stage"])}>
                {STAGES.map(stage => <option key={stage.key} value={stage.key}>{stage.name}</option>)}
              </select>
            </label>
            <label>Urgencia
              <select value={selectedDetails.priority ?? "normal"} className={"pm-control-heat pm-heat-" + (selectedDetails.priority ?? "normal")} onChange={event => onDetailsChange(selected.id, { priority: event.target.value as ProjectPriority })}>
                {PRIORITIES.map(priority => <option key={priority.key} value={priority.key}>{priority.name}</option>)}
              </select>
            </label>
            <label>Fecha objetivo
              <input type="date" value={selectedDetails.dueDate ?? ""} onChange={event => onDetailsChange(selected.id, { dueDate: event.target.value })}/>
            </label>
          </div>
        </div>
        <div className="pm-project-columns">
          <div className="pm-project-primary">
            <section className="pm-section">
              <div className="pm-section-heading"><h2>Resumen del proyecto</h2><span>Contexto de trabajo</span></div>
              <label className="pm-field-label" htmlFor="pm-brief">Brief y objetivo</label>
              <textarea id="pm-brief" rows={3} value={briefDraft} placeholder="Objetivo, alcance, entregables y criterios de aceptación..." onChange={event => setBriefDraft(event.target.value)}/>
              <div className="pm-edit-actions"><button disabled={briefDraft === (selectedDetails.brief ?? "")} onClick={() => onDetailsChange(selected.id, { brief: briefDraft })}>Guardar brief</button></div>
            </section>
            <section className="pm-section">
              <div className="pm-section-heading"><h2>Tareas</h2><span>{doneTasks}/{tasks.length} completadas</span></div>
              {tasks.length > 0 && <div className="pm-task-progress"><span style={{ width: (doneTasks / tasks.length * 100) + "%" }}/></div>}
              <div className="pm-task-list">
                {tasks.length === 0 && <p className="pm-placeholder">Sin tareas todavía. Agrega la primera para organizar el trabajo.</p>}
                {tasks.map(task => <div className="pm-task" key={task.id}>
                  <button aria-label={task.done ? "Marcar pendiente" : "Marcar completada"} onClick={() => switchTask(task)}>{task.done ? <CheckCircle2 size={19}/> : <Circle size={19}/>}</button>
                  <span className={task.done ? "pm-task-done" : ""}>{task.title}</span>
                  <button className="pm-delete" aria-label={"Eliminar " + task.title} onClick={() => removeTask(task)}><Trash2 size={14}/></button>
                </div>)}
              </div>
              <form className="pm-task-entry" onSubmit={addTask}>
                <input aria-label="Nueva tarea" value={taskDraft} onChange={event => setTaskDraft(event.target.value)} maxLength={140} placeholder="Escribe una tarea..."/>
                <button type="submit" disabled={!taskDraft.trim()}><Plus size={16}/> Agregar</button>
              </form>
            </section>
            <section className="pm-section">
              <div className="pm-section-heading"><h2>Notas y decisiones</h2><span>Privadas de este navegador</span></div>
              <textarea rows={4} value={noteDraft} placeholder="Acuerdos, pendientes, avances o decisiones..." onChange={event => setNoteDraft(event.target.value)}/>
              <div className="pm-edit-actions"><button disabled={noteDraft === (selectedDetails.notes ?? "")} onClick={() => onDetailsChange(selected.id, { notes: noteDraft })}>Guardar notas</button></div>
            </section>
          </div>
          <aside className="pm-project-aside">
            <section className="pm-section pm-crm-card">
              <div className="pm-section-heading"><h2>Cliente</h2><span>Mini CRM</span></div>
              <label className="pm-field-label" htmlFor="pm-client-select">Vinculado a este proyecto</label>
              <select id="pm-client-select" value={selectedClientId} onChange={event => onDetailsChange(selected.id, { clientId: event.target.value })}>
                <option value="">Sin cliente</option>
                {availableClients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {client ? <div className="pm-client-profile">
                <div className="pm-client-identity">
                  <span className="pm-client-emblem" style={{ background: client.brandColor }}>{client.name.slice(0,2).toUpperCase()}</span>
                  <div><strong>{client.name}</strong><small>{client.industry || "Sin categoría"}</small></div>
                </div>
                <p>{client.description || "Añade una descripción del cliente."}</p>
                {client.contactName && <div className="pm-contact-field"><UserRound size={14}/>{client.contactName}</div>}
                {client.contactEmail && <div className="pm-contact-field"><ContactRound size={14}/><a href={"mailto:" + client.contactEmail}>{client.contactEmail}</a></div>}
                {client.contactPhone && <div className="pm-contact-field"><ContactRound size={14}/>{client.contactPhone}</div>}
                {safeUrl(client.website) && <a className="pm-client-website" href={safeUrl(client.website)} target="_blank" rel="noopener noreferrer">Sitio del cliente <ExternalLink size={13}/></a>}
                <button className="pm-outline-action" onClick={() => startClientEdit(client)}>Editar ficha del cliente <ArrowUpRight size={14}/></button>
              </div> : <p className="pm-placeholder">Vincula un cliente para tener su identidad y contactos aquí.</p>}
              <button className="pm-add-client" onClick={() => startClientEdit()}><Plus size={15}/> Nuevo cliente</button>
            </section>
            <section className="pm-section pm-missions-card">
              <div className="pm-section-heading"><h2>Misiones</h2><span>{projectMissions.length}</span></div>
              {projectMissions.length === 0 ? <p className="pm-placeholder">Este proyecto no tiene misiones vinculadas.</p> : projectMissions.map(mission => <div key={mission.id} className="pm-mission-item"><span className="pm-mission-pip"/><div><strong>{mission.title}</strong><small>{mission.demo ? "Ejemplo" : "Borrador local"}</small></div></div>)}
              <button className="pm-outline-action" onClick={onGoMissions}>Ver misiones de la empresa <ArrowRight size={14}/></button>
            </section>
            <div className="pm-local-disclaimer"><Clock3 size={15}/><p>Las tareas, prioridades, clientes y notas se guardan en este navegador. La app todavía no sincroniza un CRM externo ni ejecuta agentes.</p></div>
          </aside>
        </div>
      </div>
    </> : <>
      <div className="pm-titlebar">
        <div><span className="pm-eyebrow">WORKSPACE / {company.name.toUpperCase()}</span><h1>Proyectos</h1><p>De la idea a la entrega, con prioridades y contexto del cliente.</p></div>
        <button className="pm-new-project" onClick={onNewProject}><Plus size={16}/> Nuevo proyecto</button>
      </div>
      <div className="pm-metrics">
        <div><span>Total</span><strong>{projects.length}</strong></div>
        <div><span>En curso</span><strong>{projects.filter(project => project.stage === "active").length}</strong></div>
        <div><span>Alta o crítica</span><strong>{projects.filter(project => ["high","critical"].includes(details[project.id]?.priority ?? "normal")).length}</strong></div>
        <div><span>Clientes</span><strong>{availableClients.length}</strong></div>
      </div>
      <div className="pm-toolbar">
        <div className="pm-view-options" role="group" aria-label="Vista de proyectos">
          <button className={mode === "board" ? "active" : ""} onClick={() => setMode("board")}><LayoutGrid size={16}/> Tablero</button>
          <button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}><List size={16}/> Lista</button>
          <button className={mode === "clients" ? "active" : ""} onClick={() => setMode("clients")}><Users size={16}/> Clientes</button>
        </div>
        {mode !== "clients" && <div className="pm-filters">
          <label className="pm-search"><Search size={15}/><input aria-label="Buscar proyectos" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar proyecto o cliente"/></label>
          <label className="pm-filter"><SlidersHorizontal size={14}/><select aria-label="Filtrar urgencia" value={heat} onChange={event => setHeat(event.target.value as ProjectPriority | "all")}><option value="all">Toda urgencia</option>{PRIORITIES.map(priority => <option key={priority.key} value={priority.key}>{priority.name}</option>)}</select></label>
        </div>}
        {mode === "clients" && <button className="pm-new-client" onClick={() => startClientEdit()}><Plus size={15}/> Nuevo cliente</button>}
      </div>
      {mode === "board" && <div className="pm-board-wrap">
        <div className="pm-kanban">
          {STAGES.map(stage => {
            const cards = orderedProjects.filter(project => project.stage === stage.key);
            return <div key={stage.key} className={"pm-column pm-column-" + stage.key} onDragOver={event => event.preventDefault()} onDrop={event => dropOnStage(event, stage.key)}>
              <div className="pm-column-head"><div><span className={"pm-stage-indicator pm-stage-indicator-" + stage.key}/><strong>{stage.name}</strong><span className="pm-column-count">{cards.length}</span></div><small>{stage.hint}</small></div>
              <div className="pm-column-cards">{cards.map(projectCard)}{cards.length === 0 && <div className="pm-column-empty">Arrastra un proyecto aquí</div>}</div>
            </div>;
          })}
        </div>
        <div className="pm-board-hint"><GripVertical size={14}/> Arrastra tarjetas para cambiar de etapa, o ábrelas para editar su urgencia y datos.</div>
      </div>}
      {mode === "list" && <div className="pm-list">
        <div className="pm-list-head"><span>Proyecto</span><span>Etapa</span><span>Urgencia</span><span>Cliente</span></div>
        {orderedProjects.map(project => {
          const priority = details[project.id]?.priority ?? "normal";
          const linked = clients.find(item => item.id === (details[project.id]?.clientId ?? (project.id === "sample-bigmedia" ? "client-bigmedia" : "")));
          return <button key={project.id} className="pm-list-item" onClick={() => showProject(project)}>
            <div><strong>{project.name}</strong><small>{project.description || "Sin descripción"}</small></div>
            <Badge stage={project.stage}/><Badge priority={priority}/><span>{linked?.name ?? "Sin cliente"}</span>
          </button>;
        })}
        {orderedProjects.length === 0 && <div className="pm-empty">No hay proyectos para los filtros seleccionados.</div>}
      </div>}
      {mode === "clients" && <div className="pm-clients">
        {availableClients.map(item => {
          const relatedProjects = projects.filter(project => (details[project.id]?.clientId ?? (project.id === "sample-bigmedia" ? "client-bigmedia" : "")) === item.id);
          return <article className="pm-directory-client" key={item.id}>
            <div className="pm-directory-accent" style={{ background:item.brandColor }}/>
            <div className="pm-directory-head"><span className="pm-client-emblem" style={{ background:item.brandColor }}>{item.name.slice(0,2).toUpperCase()}</span><button onClick={() => startClientEdit(item)}>Editar <ArrowUpRight size={13}/></button></div>
            <h2>{item.name}</h2><span>{item.industry || "Sin industria"}</span>
            <p>{item.description || "Completa la descripción del cliente."}</p>
            <div className="pm-directory-bottom"><strong>{relatedProjects.length}</strong><span>{relatedProjects.length === 1 ? "proyecto vinculado" : "proyectos vinculados"}</span></div>
          </article>;
        })}
        {availableClients.length === 0 && <div className="pm-empty">Todavía no hay clientes. Crea uno para vincularlo a un proyecto.</div>}
      </div>}
      <p className="pm-footer-note">Vista de trabajo local · Los cambios se guardan en este navegador; no se presentan como actividad real de agentes.</p>
    </>}
    {clientEditor && <div className="pm-dialog-overlay" onClick={event => {if(event.target === event.currentTarget) setClientEditor(false);}}>
      <form className="pm-dialog" onSubmit={saveClient}>
        <div className="pm-dialog-head"><div><span>MINI CRM</span><h2>{clients.some(item=>item.id===clientDraft.id) ? "Editar cliente" : "Nuevo cliente"}</h2><p>Información e identidad visual del cliente.</p></div><button type="button" aria-label="Cerrar" onClick={() => setClientEditor(false)}><X size={18}/></button></div>
        <label>Nombre del cliente<input required maxLength={90} value={clientDraft.name} onChange={event => setClientDraft({ ...clientDraft, name:event.target.value })} placeholder="Ej. Big Media"/></label>
        <label>Descripción<textarea rows={3} maxLength={500} value={clientDraft.description} onChange={event=>setClientDraft({ ...clientDraft, description:event.target.value })} placeholder="¿Qué hace este cliente?"/></label>
        <div className="pm-form-grid"><label>Industria<input maxLength={100} value={clientDraft.industry} onChange={event=>setClientDraft({ ...clientDraft, industry:event.target.value })} placeholder="Publicidad"/></label><label>Color de marca<input type="color" value={clientDraft.brandColor} onChange={event=>setClientDraft({ ...clientDraft, brandColor:event.target.value })}/></label></div>
        <label>Sitio web<input type="url" value={clientDraft.website} onChange={event=>setClientDraft({ ...clientDraft, website:event.target.value })} placeholder="https://..."/></label>
        <div className="pm-form-grid"><label>Contacto principal<input maxLength={90} value={clientDraft.contactName} onChange={event=>setClientDraft({ ...clientDraft, contactName:event.target.value })} placeholder="Sin registrar"/></label><label>Correo<input type="email" value={clientDraft.contactEmail} onChange={event=>setClientDraft({ ...clientDraft, contactEmail:event.target.value })} placeholder="nombre@empresa.com"/></label></div>
        <label>Teléfono<input type="tel" value={clientDraft.contactPhone} onChange={event=>setClientDraft({ ...clientDraft, contactPhone:event.target.value })} placeholder="Sin registrar"/></label>
        <p className="pm-form-notice">Solo este navegador. No agregues datos sensibles hasta conectar autenticación y almacenamiento seguro.</p>
        <div className="pm-form-buttons"><button type="button" onClick={() => setClientEditor(false)}>Cancelar</button><button type="submit"><Check size={16}/> Guardar cliente</button></div>
      </form>
    </div>}
  </div>;
}
