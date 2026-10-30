"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowUpRight, BookOpen, BrainCircuit, Check, CircleAlert, Code2,
  Download, FileCheck2, FileCode2, GitBranch, Lightbulb, Plus, ShieldCheck,
  SlidersHorizontal, Sparkles, Target, Trash2, TrendingUp, X,
} from "lucide-react";
import type {
  BrandGuide, Company, DepartmentContext, DepartmentKpi, DepartmentLesson, DepartmentObjective,
} from "@/lib/types";
import {
  DEPARTMENT_TEMPLATES, makeDepartmentContext, isApprovedLesson,
  departmentYaml, departmentKnowledgeMarkdown, departmentReviewJson,
} from "@/lib/department-context";

type Props = {
  company: Company;
  departments: DepartmentContext[];
  brand?: BrandGuide;
  onSave: (context: DepartmentContext) => void;
};
type Panel = "identity" | "objectives" | "kpis" | "learning" | "export";
const SECTIONS: { key: Panel; title: string; description: string }[] = [
  { key: "identity", title: "Contexto operativo", description: "Qué debe saber el agente" },
  { key: "objectives", title: "Objetivos", description: "Prioridades y resultados" },
  { key: "kpis", title: "KPIs", description: "Cómo se mide el resultado" },
  { key: "learning", title: "Aprendizaje", description: "Experiencias y revisión humana" },
  { key: "export", title: "Paquete para agentes", description: "YAML, Markdown y JSON" },
];
const id = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const filePart = (s: string) => s.toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "department";
function saveDownload(fileName: string, text: string, mime = "text/plain") {
  const objectUrl = URL.createObjectURL(new Blob([text], { type: mime + ";charset=utf-8" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
function Field({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <label className="dc-field"><span>{title}</span>{hint && <small>{hint}</small>}{children}</label>;
}
function TextArea({ value, onChange, placeholder = "", rows = 3 }: { value: string; onChange: (next: string) => void; placeholder?: string; rows?: number }) {
  return <textarea rows={rows} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}/>;
}
export function DepartmentWorkspace({ company, departments, brand, onSave }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("identity");
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [newObjective, setNewObjective] = useState("");
  const [newKpi, setNewKpi] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [showPreview, setShowPreview] = useState<"yaml" | "md" | "json">("yaml");

  const current = departments.find(d => d.id === selectedId) ?? null;
  const available = DEPARTMENT_TEMPLATES.filter(t =>
    !departments.some(d => d.name.trim().toLowerCase() === t.name.toLowerCase()));
  const approved = current?.lessons.filter(isApprovedLesson) ?? [];
  const currentYaml = useMemo(() => current ? departmentYaml(company, current, brand) : "", [company, current, brand]);
  const currentMd = useMemo(() => current ? departmentKnowledgeMarkdown(company, current) : "", [company, current]);

  function edit(patch: Partial<DepartmentContext>) {
    if (!current) return;
    onSave({ ...current, ...patch,
      id: current.id, companyId: current.companyId,
      revision: current.revision + 1, updatedAt: new Date().toISOString() });
  }
  function addPreset(name: string, purpose: string, role: string) {
    const ctx = makeDepartmentContext(company.id, name, purpose, role);
    onSave(ctx);
    setSelectedId(ctx.id);
    setPanel("identity");
  }
  function addCustom() {
    if (!customName.trim()) return;
    const existing = departments.find(d => d.name.toLowerCase() === customName.trim().toLowerCase());
    if (existing) { setSelectedId(existing.id); setAddingCustom(false); return; }
    addPreset(customName.trim(), "", "");
    setCustomName("");
    setAddingCustom(false);
  }
  function addObjective() {
    if (!current || !newObjective.trim()) return;
    const o: DepartmentObjective = { id: id(), text: newObjective.trim(), priority: "medium", status: "active" };
    edit({ objectives: [...current.objectives, o] }); setNewObjective("");
  }
  function patchObjective(oid: string, p: Partial<DepartmentObjective>) {
    if (!current) return;
    edit({ objectives: current.objectives.map(o => o.id === oid ? { ...o, ...p } : o) });
  }
  function addKpi() {
    if (!current || !newKpi.trim()) return;
    const k: DepartmentKpi = { id: id(), name: newKpi.trim(), target: "", unit: "", cadence: "", measurementSource: "" };
    edit({ kpis: [...current.kpis, k] }); setNewKpi("");
  }
  function patchKpi(kid: string, p: Partial<DepartmentKpi>) {
    if (!current) return;
    edit({ kpis: current.kpis.map(k => k.id === kid ? { ...k, ...p } : k) });
  }
  function addLesson() {
    if (!current || !lessonTitle.trim()) return;
    const l: DepartmentLesson = { id: id(), title: lessonTitle.trim(), category: "insight",
      situation: "", outcome: "", learning: "", evidenceUrl: "", observedAt: "",
      status: "draft", reviewedBy: "" };
    edit({ lessons: [l, ...current.lessons] });setLessonTitle("");
  }
  function patchLesson(lid: string, p: Partial<DepartmentLesson>) {
    if (!current) return;
    edit({ lessons: current.lessons.map(l => l.id === lid ? { ...l, ...p, status: "status" in p ? p.status ?? l.status : "draft" } : l) });
  }
  function download(kind: "yaml" | "md" | "json") {
    if (!current) return;
    const prefix = filePart(company.name) + "-" + filePart(current.name);
    if (kind === "yaml") saveDownload(prefix + "-context.yaml", currentYaml, "application/yaml");
    else if (kind === "md") saveDownload(prefix + "-knowledge.md", currentMd, "text/markdown");
    else saveDownload(prefix + "-review.json", departmentReviewJson(company, current, brand), "application/json");
  }
  return <div className="dc-root">
    {!current ? <>
      <header className="dc-page-header">
        <div><span className="dc-eyebrow">CONTEXTO ORGANIZACIONAL · {company.name.toUpperCase()}</span>
          <h1>Departamentos</h1>
          <p>La memoria operativa de cada área, creada para que un agente genérico de Crobi sepa cómo trabajar aquí.</p>
        </div>
        <button className="dc-dark-button" onClick={() => setAddingCustom(v => !v)}><Plus size={15}/> Nuevo departamento</button>
      </header>
      <div className="dc-summary">
        <div><BrainCircuit size={19}/><strong>{departments.length}</strong><span>Áreas configuradas</span></div>
        <div><Target size={19}/><strong>{departments.reduce((n,d)=>n+d.objectives.length,0)}</strong><span>Objetivos registrados</span></div>
        <div><TrendingUp size={19}/><strong>{departments.reduce((n,d)=>n+d.kpis.length,0)}</strong><span>KPIs configurados</span></div>
        <div><ShieldCheck size={19}/><strong>{departments.reduce((n,d)=>n+d.lessons.filter(isApprovedLesson).length,0)}</strong><span>Aprendizajes verificados</span></div>
      </div>
      <div className="dc-intro-note"><Sparkles size={17}/><span>Un agente puede ser reutilizable; su contexto no. Cada departamento pertenece exclusivamente a <strong>{company.name}</strong>. Los permisos de Crobi permanecen separados.</span></div>
      {addingCustom && <form className="dc-add-box" onSubmit={e => {e.preventDefault();addCustom();}}>
        <input autoFocus placeholder="Nombre del departamento, ej. Recursos Humanos" maxLength={90} value={customName} onChange={e => setCustomName(e.target.value)}/>
        <button type="submit" disabled={!customName.trim()} className="dc-dark-button">Crear <Plus size={14}/></button>
        <button type="button" className="dc-icon-btn" onClick={() => setAddingCustom(false)} aria-label="Cancelar"><X size={15}/></button>
      </form>}
      {!!departments.length && <section className="dc-section"><div className="dc-section-heading"><h2>Áreas de {company.name}</h2><p>Abre un departamento para editar sus instrucciones, métricas y memoria.</p></div>
        <div className="dc-grid">{departments.map(d=><button key={d.id} className="dc-department-card" onClick={() => {setSelectedId(d.id);setPanel("identity");}}>
          <div className="dc-card-top"><span className="dc-dept-icon"><BrainCircuit size={19}/></span><ArrowUpRight size={16}/></div>
          <strong>{d.name}</strong><p>{d.purpose || "Define el propósito y las prioridades de esta área."}</p>
          <div className="dc-card-stats"><span>{d.objectives.length} objetivos</span><span>{d.kpis.length} KPIs</span><span>{d.lessons.filter(isApprovedLesson).length} aprendizajes aprobados</span></div>
        </button>)}</div></section>}
      {!!available.length && <section className="dc-section"><div className="dc-section-heading"><h2>Plantillas de departamentos</h2><p>Estos nombres son sugerencias, no información verificada sobre la empresa. Se crean vacíos y editables.</p></div>
        <div className="dc-template-grid">{available.map(d => <button key={d.name} onClick={() => addPreset(d.name, d.purpose, d.role)}>
          <span><span className="dc-template-icon"><Plus size={15}/></span><strong>{d.name}</strong></span><small>{d.purpose}</small>
        </button>)}</div></section>}
    </> : <>
      <div className="dc-breadcrumb"><button onClick={() => setSelectedId(null)}><ArrowLeft size={15}/> Departamentos</button><span>/</span><strong>{current.name}</strong></div>
      <header className="dc-detail-header">
        <div><span className="dc-eyebrow">CONTEXTO PARA AGENTES · {company.name.toUpperCase()}</span><h1>{current.name}</h1><p>{current.purpose || "Contexto departamental pendiente de configurar"}</p></div>
        <div className="dc-header-controls"><span><FileCheck2 size={13}/> Rev. {current.revision}</span><button className="dc-dark-button" onClick={() => setPanel("export")}><Download size={15}/> Exportar contexto</button></div>
      </header>
      <div className="dc-detail-layout">
        <nav className="dc-nav" aria-label="Configuración del departamento">
          <span>CONTEXTO DEL ÁREA</span>
          {SECTIONS.map(sec=><button key={sec.key} className={panel===sec.key?"is-selected":""} onClick={() => setPanel(sec.key)}>
            {sec.key==="identity"?<SlidersHorizontal size={16}/>:sec.key==="objectives"?<Target size={16}/>:sec.key==="kpis"?<TrendingUp size={16}/>:sec.key==="learning"?<Lightbulb size={16}/>:<FileCode2 size={16}/>}
            <span><strong>{sec.title}</strong><small>{sec.description}</small></span>
          </button>)}
          <div className="dc-nav-foot"><ShieldCheck size={16}/> La autoridad y los permisos se administran dentro de Crobi, no aquí.</div>
        </nav>
        <main className="dc-panel">
          {panel==="identity" && <>
            <div className="dc-panel-title"><h2>Instrucciones de contexto</h2><p>Datos que definen cómo debe actuar un agente cuando trabaja dentro de este departamento.</p></div>
            <div className="dc-field-grid">
              <Field title="Nombre del departamento"><input maxLength={90} value={current.name} onChange={e => edit({name:e.target.value})}/></Field>
              <Field title="Rol de agente genérico solicitado" hint="Referencia descriptiva. No crea ni activa un agente."><input maxLength={120} value={current.agentRole} placeholder="Ej. performance_marketing_lead" onChange={e => edit({agentRole:e.target.value})}/></Field>
            </div>
            <Field title="Propósito" hint="Responsabilidad concreta de este departamento."><TextArea rows={2} value={current.purpose} onChange={v=>edit({purpose:v})} placeholder="Por qué existe este departamento..."/></Field>
            <Field title="Misión y alcance"><TextArea value={current.mission} onChange={v=>edit({mission:v})} placeholder="Qué resultados debe perseguir y qué decisiones apoya..."/></Field>
            <Field title="Definición de éxito"><TextArea rows={2} value={current.successCriteria} onChange={v=>edit({successCriteria:v})} placeholder="Cómo se reconoce un buen resultado sin inventar métricas..."/></Field>
            <div className="dc-divider-label">COMPORTAMIENTO Y OPERACIÓN</div>
            <Field title="Tono de voz del departamento"><TextArea rows={2} value={current.toneOfVoice} onChange={v=>edit({toneOfVoice:v})} placeholder="Ej. claro, directo, fundamentado en datos..."/></Field>
            <Field title="Modo de trabajo"><TextArea value={current.workMode} onChange={v=>edit({workMode:v})} placeholder="Cómo planifica, comunica el avance y colabora con humanos y agentes..."/></Field>
            <Field title="Procedimiento o playbook"><TextArea rows={5} value={current.operatingProcedure} onChange={v=>edit({operatingProcedure:v})} placeholder="Pasos, validaciones, estándares de calidad, condiciones de salida..."/></Field>
            <Field title="Restricciones operativas"><TextArea rows={2} value={current.constraints} onChange={v=>edit({constraints:v})} placeholder="Qué no debe asumir, hacer o prometer este departamento..."/></Field>
            <Field title="Escalamientos y aprobación humana"><TextArea rows={3} value={current.escalationRules} onChange={v=>edit({escalationRules:v})} placeholder="Cuándo debe detenerse y pedir autorización..."/></Field>
            <div className="dc-field-grid">
              <Field title="Entradas esperadas"><TextArea value={current.expectedInputs} onChange={v=>edit({expectedInputs:v})} placeholder="Brief, CRM, reportes, identidad aprobada..."/></Field>
              <Field title="Salidas esperadas"><TextArea value={current.expectedOutputs} onChange={v=>edit({expectedOutputs:v})} placeholder="Recomendación, reporte, plan de trabajo, propuesta..."/></Field>
            </div>
          </>}
          {panel==="objectives" && <>
            <div className="dc-panel-title"><h2>Objetivos del departamento</h2><p>Prioridades del área, independientes de las tareas y misiones que ejecutará el agente.</p></div>
            {current.objectives.map((o,i)=><div key={o.id} className="dc-record">
              <div className="dc-record-top"><span>OBJETIVO {String(i+1).padStart(2,"0")}</span><button onClick={()=>edit({objectives:current.objectives.filter(x=>x.id!==o.id)})} aria-label="Eliminar objetivo"><Trash2 size={14}/></button></div>
              <Field title="Resultado esperado"><TextArea rows={2} value={o.text} onChange={v=>patchObjective(o.id,{text:v})}/></Field>
              <div className="dc-field-grid"><Field title="Prioridad"><select value={o.priority} onChange={e=>patchObjective(o.id,{priority:e.target.value as DepartmentObjective["priority"]})}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></Field>
                <Field title="Estado"><select value={o.status} onChange={e=>patchObjective(o.id,{status:e.target.value as DepartmentObjective["status"]})}><option value="active">Activo</option><option value="paused">Pausado</option><option value="achieved">Alcanzado</option></select></Field></div>
            </div>)}
            {!current.objectives.length && <div className="dc-empty-inline"><Target size={20}/><strong>Aún no hay objetivos</strong><p>Los objetivos no se generan automáticamente: defínelos según la estrategia real de la empresa.</p></div>}
            <form className="dc-add-row" onSubmit={e=>{e.preventDefault();addObjective();}}><input placeholder="Nuevo objetivo..." value={newObjective} onChange={e=>setNewObjective(e.target.value)}/><button disabled={!newObjective.trim()} className="dc-dark-button"><Plus size={14}/> Añadir</button></form>
          </>}
          {panel==="kpis" && <>
            <div className="dc-panel-title"><h2>Indicadores y KPIs</h2><p>Registra qué se mide, cuál es el objetivo y de dónde debe obtenerse el dato. Nunca mostramos metas como resultados observados.</p></div>
            {current.kpis.map((k,i)=><div key={k.id} className="dc-record"><div className="dc-record-top"><span>KPI {String(i+1).padStart(2,"0")}</span><button aria-label="Eliminar KPI" onClick={()=>edit({kpis:current.kpis.filter(x=>x.id!==k.id)})}><Trash2 size={14}/></button></div>
              <Field title="Métrica"><input value={k.name} onChange={e=>patchKpi(k.id,{name:e.target.value})}/></Field>
              <div className="dc-field-grid"><Field title="Meta"><input value={k.target} onChange={e=>patchKpi(k.id,{target:e.target.value})} placeholder="Ej. 25"/></Field>
                <Field title="Unidad"><input value={k.unit} onChange={e=>patchKpi(k.id,{unit:e.target.value})} placeholder="%, MXN, leads..."/></Field>
                <Field title="Frecuencia"><input value={k.cadence} onChange={e=>patchKpi(k.id,{cadence:e.target.value})} placeholder="Semanal, mensual..."/></Field>
                <Field title="Fuente de medición"><input value={k.measurementSource} onChange={e=>patchKpi(k.id,{measurementSource:e.target.value})} placeholder="CRM, GA4, dashboard..."/></Field></div>
              {!k.measurementSource.trim() && <p className="dc-warning"><CircleAlert size={14}/> Falta la fuente: el agente no debe reportar valores actuales sin evidencia.</p>}
            </div>)}
            {!current.kpis.length && <div className="dc-empty-inline"><TrendingUp size={20}/><strong>Sin KPIs definidos</strong><p>Agrega indicadores trazables. Las cifras observadas se consultarán cuando exista una fuente conectada.</p></div>}
            <form className="dc-add-row" onSubmit={e=>{e.preventDefault();addKpi();}}><input placeholder="Nombre del KPI..." value={newKpi} onChange={e=>setNewKpi(e.target.value)}/><button className="dc-dark-button" disabled={!newKpi.trim()}><Plus size={14}/> Añadir</button></form>
          </>}
          {panel==="learning" && <>
            <div className="dc-panel-title"><h2>Memoria de aprendizaje</h2><p>Registra qué funcionó, qué falló y qué debe cambiar. Un aprendizaje solo entra en el contexto del agente después de revisión humana y evidencia HTTPS.</p></div>
            <div className="dc-learning-summary"><span><ShieldCheck size={15}/> {approved.length} aprobados con evidencia</span><span>{current.lessons.length-approved.length} pendientes o excluidos del contexto</span></div>
            {current.lessons.map((l,i)=><article className="dc-record" key={l.id}>
              <div className="dc-record-top"><span>EXPERIENCIA {String(current.lessons.length-i).padStart(2,"0")}</span><button aria-label="Eliminar aprendizaje" onClick={()=>edit({lessons:current.lessons.filter(x=>x.id!==l.id)})}><Trash2 size={14}/></button></div>
              <div className="dc-record-state"><span className={isApprovedLesson(l)?"dc-approved":"dc-draft"}>{isApprovedLesson(l)?"Aprobado para agentes":l.status==="rejected"?"Rechazado / no usar":"No verificado"}</span></div>
              <Field title="Título"><input value={l.title} onChange={e=>patchLesson(l.id,{title:e.target.value})}/></Field>
              <div className="dc-field-grid"><Field title="Tipo de experiencia"><select value={l.category} onChange={e=>patchLesson(l.id,{category:e.target.value as DepartmentLesson["category"],status:"draft"})}><option value="worked">Funcionó</option><option value="failed">Falló</option><option value="insight">Hallazgo</option><option value="decision">Decisión</option></select></Field>
                <Field title="Fecha de observación"><input type="date" value={l.observedAt} onChange={e=>patchLesson(l.id,{observedAt:e.target.value,status:"draft"})}/></Field></div>
              <Field title="Contexto / situación"><TextArea rows={2} value={l.situation} onChange={v=>patchLesson(l.id,{situation:v,status:"draft"})}/></Field>
              <Field title="Resultado observado"><TextArea rows={2} value={l.outcome} onChange={v=>patchLesson(l.id,{outcome:v,status:"draft"})}/></Field>
              <Field title="Aprendizaje aplicable"><TextArea rows={3} value={l.learning} onChange={v=>patchLesson(l.id,{learning:v,status:"draft"})} placeholder="Qué debería repetir o evitar un agente en el futuro..."/></Field>
              <div className="dc-field-grid"><Field title="URL HTTPS de evidencia"><input type="url" placeholder="https://..." value={l.evidenceUrl} onChange={e=>patchLesson(l.id,{evidenceUrl:e.target.value,status:"draft"})}/></Field>
                <Field title="Revisado por"><input value={l.reviewedBy} placeholder="Persona responsable" onChange={e=>patchLesson(l.id,{reviewedBy:e.target.value,status:"draft"})}/></Field></div>
              <div className="dc-review-actions">
                <button className="dc-outline-button" onClick={()=>patchLesson(l.id,{status:"draft"})}>Borrador</button>
                <button className="dc-outline-button" onClick={()=>patchLesson(l.id,{status:"rejected"})}>Rechazar</button>
                <button className="dc-dark-button" disabled={!l.title.trim()||!l.learning.trim()||!l.reviewedBy.trim()||!/^https:\/\/[^\s/]+/i.test(l.evidenceUrl.trim())} onClick={()=>patchLesson(l.id,{status:"approved"})}><Check size={14}/> Aprobar aprendizaje</button>
              </div>
            </article>)}
            {!current.lessons.length && <div className="dc-empty-inline"><Lightbulb size={20}/><strong>La memoria empieza con experiencias reales</strong><p>No inventamos lecciones ni éxitos. Cada aprendizaje será validado antes de entrar en el contexto del agente.</p></div>}
            <form className="dc-add-row" onSubmit={e=>{e.preventDefault();addLesson();}}><input placeholder="Título de la experiencia..." value={lessonTitle} onChange={e=>setLessonTitle(e.target.value)}/><button className="dc-dark-button" disabled={!lessonTitle.trim()}><Plus size={14}/> Registrar</button></form>
          </>}
          {panel==="export" && <>
            <div className="dc-panel-title"><h2>Paquete de contexto para Crobi</h2><p>Exportación de datos separada de las capacidades y permisos reales del agente.</p></div>
            <div className="dc-export-grid">
              <button onClick={()=>download("yaml")}><span><FileCode2 size={20}/></span><strong>context.yaml</strong><small>Misión, KPI, objetivos, tono, procedimientos y marca aprobada</small><Download size={15}/></button>
              <button onClick={()=>download("md")}><span><BookOpen size={20}/></span><strong>knowledge.md</strong><small>Aprendizajes revisados con fuente; excluye borradores</small><Download size={15}/></button>
              <button onClick={()=>download("json")}><span><GitBranch size={20}/></span><strong>review.json</strong><small>Instantánea completa para auditoría, incluye pendientes</small><Download size={15}/></button>
            </div>
            <div className="dc-preview-head"><h3>Vista previa del paquete</h3><div>{(["yaml","md","json"] as const).map(k=><button key={k} className={showPreview===k?"active":""} onClick={()=>setShowPreview(k)}>{k.toUpperCase()}</button>)}</div></div>
            <pre className="dc-code-preview"><code>{showPreview==="yaml"?currentYaml:showPreview==="md"?currentMd:departmentReviewJson(company,current,brand)}</code></pre>
            <div className="dc-security-note"><ShieldCheck size={19}/><div><strong>Solo contexto, nunca autoridad</strong><p>Crobi debe validar permisos de memoria, acceso a herramientas, empresa y aprobaciones humanas en su propio runtime. Este paquete no crea agentes ni otorga acceso; todavía no existe sincronización automática.</p></div></div>
          </>}
        </main>
      </div>
      <p className="dc-footnote">Guardado localmente en este navegador. Las aprobaciones declaradas aquí no verifican la identidad del revisor. Evita secretos o datos personales; no hay backend, permisos ni historial de auditoría central.</p>
    </>}
  </div>;
}
