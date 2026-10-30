"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleDollarSign,
  Copy, Download, FileText, ImagePlus, LayoutTemplate, Plus, Printer,
  ReceiptText, Save, Search, Settings2, Trash2, X,
} from "lucide-react";
import type { BrandGuide, Client, Company, ProposalDocument, ProposalLineItem, ProposalTemplate } from "@/lib/types";
import { generateProposal, hexColor, money, newLineItem, proposalTotals, quoteTemplatePresets, safeLogoSrc } from "@/lib/proposal-utils";

type Props = {
  company: Company; clients: Client[]; brand?: BrandGuide;
  proposals: ProposalDocument[]; templates: ProposalTemplate[];
  onSave: (value: ProposalDocument) => void;
  onDelete: (id: string) => void;
  onSaveTemplate: (value: ProposalTemplate) => void;
};
type EditorTab = "details" | "pricing" | "design";
const id = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const statusLabel: Record<ProposalDocument["status"],string> = {
  draft: "Borrador", sent: "Enviada (manual)", approved: "Aceptada (manual)", declined: "Rechazada (manual)",
};
const moneyTag = (value:number,currency:"MXN"|"USD") => money(value,currency);
function safeLink(url:string) {
  try { const parsed=new URL(url);return parsed.protocol==="https:"||parsed.protocol==="http:"?parsed.toString():""; }
  catch { return ""; }
}
function Field({label,children,hint}:{label:string;children:React.ReactNode;hint?:string}) {
  return <label className="qp-field"><strong>{label}</strong>{hint&&<small>{hint}</small>}{children}</label>;
}
function Area({value,change,rows=3,placeholder=""}:{value:string;change:(v:string)=>void;rows?:number;placeholder?:string}) {
  return <textarea rows={rows} value={value} onChange={e=>change(e.target.value)} placeholder={placeholder}/>;
}
function Preview({ company, brand, quote }:{company:Company;brand?:BrandGuide;quote:ProposalDocument}) {
  const template=quote.templateSnapshot;
  const brandColor=(brand?.colors??[]).find(c=>c.approved && c.role==="primary")?.hex;
  const accent=hexColor(template.useBrandSheet && brandColor?brandColor:template.accentHex);
  const brandLogo=(brand?.logos??[]).find(l=>l.approved && l.variant==="primary" && safeLogoSrc(l.dataUrl||l.url))
    ??(brand?.logos??[]).find(l=>l.approved && safeLogoSrc(l.dataUrl||l.url));
  const logo=safeLogoSrc(template.useBrandSheet?(brandLogo?.dataUrl||brandLogo?.url||""):template.customLogoUrl);
  const totals=proposalTotals(quote);
  return <article className={"qp-preview-sheet qp-template-"+template.layout} style={{["--qp-accent" as string]:accent}} aria-label={"Vista previa de propuesta "+quote.number}>
    <div className="qp-paper-decoration" />
    <div className="qp-paper-header">
      <div className="qp-paper-brand">
        {logo?<img className="qp-paper-logo" alt={"Logo de "+company.name} src={logo}/>:<div className="qp-paper-monogram">{company.short||company.name.slice(0,2).toUpperCase()}</div>}
        <div><strong>{company.name}</strong><span>{template.sellerTagline||"Propuesta comercial"}</span></div>
      </div>
      <div className="qp-paper-id"><span>PROPUESTA / COTIZACIÓN</span><strong>{quote.number}</strong></div>
    </div>
    <div className="qp-paper-intro">
      <span className="qp-paper-eyebrow">PROYECTO</span>
      <h1>{quote.title||"Propuesta de servicios"}</h1>
      <p>{quote.introduction}</p>
    </div>
    <div className="qp-paper-parties">
      <div><span>PREPARADA PARA</span><strong>{quote.clientName||"Nombre del cliente"}</strong>{quote.clientContact&&<small>{quote.clientContact}</small>}</div>
      <div><span>EMISIÓN</span><strong>{quote.issueDate||"Por definir"}</strong></div>
      <div><span>VÁLIDA HASTA</span><strong>{quote.validUntil||"Por definir"}</strong></div>
    </div>
    {(quote.scope||quote.deliverables||quote.timeline) && <div className="qp-paper-sections">
      {quote.scope&&<section><h2>Alcance del proyecto</h2><p>{quote.scope}</p></section>}
      {quote.deliverables&&<section><h2>Entregables</h2><p>{quote.deliverables}</p></section>}
      {quote.timeline&&<section><h2>Calendario estimado</h2><p>{quote.timeline}</p></section>}
    </div>}
    <div className="qp-paper-pricing">
      <div className="qp-paper-section-head"><h2>Inversión</h2><span>{quote.currency}</span></div>
      <table><thead><tr><th>Concepto</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead>
        <tbody>{quote.items.map(item=><tr key={item.id}><td><strong>{item.description||"Concepto"}</strong>{item.details&&<small>{item.details}</small>}</td><td>{Math.max(0,Number(item.quantity)||0)} {item.unit}</td><td>{moneyTag(Math.max(0,Number(item.unitPrice)||0),quote.currency)}</td><td>{moneyTag(Math.max(0,Number(item.quantity)||0)*Math.max(0,Number(item.unitPrice)||0),quote.currency)}</td></tr>)}</tbody>
      </table>
      <div className="qp-paper-total-box">
        <div><span>Subtotal</span><strong>{moneyTag(totals.subtotal,quote.currency)}</strong></div>
        <div><span>Impuestos ({quote.taxPercent}%)</span><strong>{moneyTag(totals.tax,quote.currency)}</strong></div>
        <div className="qp-paper-grand"><span>Inversión total</span><strong>{moneyTag(totals.total,quote.currency)}</strong></div>
        {quote.depositPercent>0&&<div><span>Anticipo sugerido ({quote.depositPercent}%)</span><strong>{moneyTag(totals.deposit,quote.currency)}</strong></div>}
      </div>
    </div>
    {(quote.terms||quote.exclusions||quote.notes) && <div className="qp-paper-footer-sections">
      {quote.terms&&<section><h3>Condiciones comerciales</h3><p>{quote.terms}</p></section>}
      {quote.exclusions&&<section><h3>Exclusiones</h3><p>{quote.exclusions}</p></section>}
      {quote.notes&&<section><h3>Notas adicionales</h3><p>{quote.notes}</p></section>}
    </div>}
    <div className="qp-paper-bottom"><strong>{company.name}</strong><div>{[template.sellerEmail,template.sellerPhone,template.sellerAddress].filter(Boolean).join(" · ")||"Propuesta comercial · Documento para revisión"}</div><small>Este documento no es un CFDI ni acredita aceptación por sí mismo.</small></div>
  </article>;
}

export function ProposalWorkspace({company,clients,brand,proposals,templates,onSave,onDelete,onSaveTemplate}:Props) {
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [tab,setTab]=useState<EditorTab>("details");
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState<"all"|ProposalDocument["status"]>("all");
  const [showTemplateEditor,setShowTemplateEditor]=useState(false);
  const [message,setMessage]=useState("");
  const [onlyPreview,setOnlyPreview]=useState(false);
  const uploadRef=useRef<HTMLInputElement>(null);
  const allTemplates=useMemo(()=>[...templates,...quoteTemplatePresets(company)], [templates,company]);
  const current=proposals.find(q=>q.id===selectedId)||null;
  const visible=proposals.filter(q=>
    (statusFilter==="all"||q.status===statusFilter)&&
    [q.title,q.number,q.clientName].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  ).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const counts={total:proposals.length,drafts:proposals.filter(q=>q.status==="draft").length,sent:proposals.filter(q=>q.status==="sent").length,approved:proposals.filter(q=>q.status==="approved").length};
  const companyTemplates=templates.filter(t=>t.companyId===company.id);

  function patch(partial:Partial<ProposalDocument>){
    if(!current)return;
    onSave({...current,...partial,id:current.id,companyId:current.companyId,createdAt:current.createdAt,updatedAt:new Date().toISOString()});
  }
  function patchTemplate(partial:Partial<ProposalTemplate>){
    if(!current)return;
    patch({templateSnapshot:{...current.templateSnapshot,...partial,id:current.templateSnapshot.id,companyId:company.id}});
  }
  function create(template:ProposalTemplate){
    const numbers=new Set(proposals.map(q=>q.number));
    let n=1; while(numbers.has("COT-"+String(n).padStart(4,"0")))n++;
    const value=generateProposal(company,template,n);
    onSave(value);setSelectedId(value.id);setTab("details");setShowTemplateEditor(false);setMessage("");
  }
  function duplicate(q:ProposalDocument){
    const numbers=new Set(proposals.map(item=>item.number));
    let n=1;while(numbers.has("COT-"+String(n).padStart(4,"0")))n++;
    const now=new Date().toISOString();
    const clone={...q,id:id(),number:"COT-"+String(n).padStart(4,"0"),status:"draft" as const,
      items:q.items.map(item=>({...item,id:id()})),createdAt:now,updatedAt:now};
    onSave(clone);setSelectedId(clone.id);setTab("details");
  }
  function deleteCurrent(){
    if(!current||!window.confirm("¿Eliminar esta propuesta? Esta acción no se puede deshacer."))return;
    onDelete(current.id);setSelectedId(null);
  }
  function setItem(itemId:string,field:Partial<ProposalLineItem>) {
    if(!current)return;
    patch({items:current.items.map(item=>item.id===itemId?{...item,...field}:item)});
  }
  function changeClient(value:string){
    const client=clients.find(c=>c.id===value);
    patch({clientId:value,clientName:client?client.name:current?.clientName||"",clientContact:client?.contactName||current?.clientContact||""});
  }
  function useTemplate(templateId:string){
    const chosen=allTemplates.find(t=>t.id===templateId);
    if(!chosen)return;
    patch({templateId:chosen.id,templateSnapshot:{...chosen}});
    setMessage("Identidad visual aplicada. El contenido y los importes de la propuesta se conservaron.");
  }
  function saveAsTemplate(){
    if(!current)return;
    const name=window.prompt("Nombre de la plantilla reutilizable",current.templateSnapshot.name+" personalizada");
    if(!name?.trim())return;
    const template:{[K in keyof ProposalTemplate]:ProposalTemplate[K]}={...current.templateSnapshot,
      id:id(),name:name.trim(),companyId:company.id,createdAt:new Date().toISOString(),
      defaultIntroduction:current.introduction,defaultScope:current.scope,
      defaultDeliverables:current.deliverables,defaultTimeline:current.timeline,
      defaultTerms:current.terms,defaultExclusions:current.exclusions,defaultNotes:current.notes,
      defaultCurrency:current.currency,defaultTaxPercent:current.taxPercent,defaultDepositPercent:current.depositPercent};
    onSaveTemplate(template);
    patch({templateId:template.id,templateSnapshot:template});
    setMessage("Plantilla guardada para esta empresa. Disponible al crear nuevas propuestas.");
  }
  async function loadLogo(file?:File){
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type))return setMessage("Usa PNG, JPG o WebP; no SVG.");
    if(file.size>150*1024)return setMessage("La vista previa debe pesar menos de 150 KB. También puedes usar una URL HTTPS.");
    try{
      const data=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(new Error("No válido"));
        reader.onerror=()=>reject(new Error("No válido"));
        reader.readAsDataURL(file);
      });
      if(!/^data:image\/(png|jpeg|webp);base64,/.test(data))throw new Error("Formato no válido");
      patchTemplate({customLogoUrl:data,useBrandSheet:false});
      setMessage("Logotipo aplicado a esta propuesta. Guarda como plantilla para reutilizarlo.");
    }catch{setMessage("No fue posible leer el archivo.");}
  }
  if(!current)return <div className="qp-root">
    <header className="qp-heading">
      <div><span className="qp-eyebrow">COMERCIAL / {company.name.toUpperCase()}</span><h1>Propuestas y cotizaciones</h1><p>Presentación consistente, identidad aprobada y cifras claras. Una plantilla reutilizable para cada empresa.</p></div>
      <button className="qp-primary" onClick={()=>create(allTemplates[0])}><Plus size={16}/> Nueva propuesta</button>
    </header>
    <div className="qp-metrics">
      <div><FileText size={18}/><span>Propuestas</span><strong>{counts.total}</strong></div>
      <div><ReceiptText size={18}/><span>Borradores</span><strong>{counts.drafts}</strong></div>
      <div><ArrowUpRight size={18}/><span>Enviadas*</span><strong>{counts.sent}</strong></div>
      <div><Check size={18}/><span>Aceptadas*</span><strong>{counts.approved}</strong></div>
    </div>
    <section className="qp-panel">
      <div className="qp-list-heading"><div><h2>Documentos comerciales</h2><p>Edición y estados registrados manualmente, sin envío automático.</p></div><div className="qp-list-filters"><label><Search size={15}/><input value={search} placeholder="Buscar propuesta..." onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Filtrar estado" value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}><option value="all">Todos</option><option value="draft">Borradores</option><option value="sent">Enviados</option><option value="approved">Aceptados</option><option value="declined">Rechazados</option></select></div></div>
      {visible.length?<div className="qp-list">{visible.map(q=><div className="qp-list-row" key={q.id}>
        <button className="qp-open-quote" onClick={()=>{setSelectedId(q.id);setTab("details");setMessage("");}}><span className="qp-list-doc-icon"><FileText size={18}/></span><span><strong>{q.title}</strong><small>{q.number} · {q.clientName||"Cliente por definir"}</small></span></button>
        <span className={"qp-status qp-status-"+q.status}>{statusLabel[q.status]}</span>
        <strong className="qp-row-total">{money(proposalTotals(q).total,q.currency)}</strong>
        <button className="qp-icon" aria-label={"Duplicar "+q.title} onClick={()=>duplicate(q)}><Copy size={15}/></button>
        <button className="qp-icon" aria-label={"Abrir "+q.title} onClick={()=>setSelectedId(q.id)}><ArrowUpRight size={16}/></button>
      </div>)}</div>:<div className="qp-empty"><span><FileText size={26}/></span><h3>{proposals.length?"No hay coincidencias":"Tu primer documento comercial"}</h3><p>{proposals.length?"Cambia el filtro para ver otras propuestas.":"Crea una propuesta con diseño consistente, conceptos, impuestos configurables y exportación mediante impresión a PDF."}</p><button className="qp-primary" onClick={()=>create(allTemplates[0])}>Crear propuesta <Plus size={14}/></button></div>}
    </section>
    <section className="qp-panel">
      <div className="qp-list-heading"><div><h2>Plantillas reutilizables</h2><p>Cada empresa conserva sus plantillas y personalizaciones por separado.</p></div><span className="qp-template-count">{companyTemplates.length} personalizadas</span></div>
      <div className="qp-template-grid">{allTemplates.map(t=><button className="qp-template-card" key={t.id} onClick={()=>create(t)}>
        <div className={"qp-template-mini qp-template-mini-"+t.layout}><div/><span/><i/><i/><b/></div><span><strong>{t.name}</strong><small>{t.useBrandSheet?"Usa Brand Sheet de empresa":"Identidad personalizada"}</small></span><Plus size={15}/></button>)}</div>
    </section>
    <p className="qp-disclaimer">*Los estados se actualizan manualmente. No genera CFDI, facturas fiscales ni envía documentos a los clientes. Los datos viven localmente en este navegador.</p>
  </div>;
  const template=current.templateSnapshot;
  const totals=proposalTotals(current);
  return <div className="qp-root qp-editor-root">
    <header className="qp-editor-top">
      <button className="qp-back" onClick={()=>{setSelectedId(null);setOnlyPreview(false);setShowTemplateEditor(false);}}><ArrowLeft size={16}/> Propuestas</button>
      <div className="qp-editor-label"><strong>{current.number}</strong><span className={"qp-status qp-status-"+current.status}>{statusLabel[current.status]}</span><small>Guardado local automático</small></div>
      <div className="qp-editor-actions">
        <button className="qp-quiet" onClick={()=>setOnlyPreview(value=>!value)}>{onlyPreview?"Editar":"Vista completa"}</button>
        <button className="qp-quiet" onClick={saveAsTemplate}><Save size={14}/> Guardar plantilla</button>
        <button className="qp-primary" onClick={()=>window.print()}><Printer size={15}/> Imprimir / PDF</button>
      </div>
    </header>
    {message&&<p role="status" className="qp-message">{message}<button aria-label="Cerrar aviso" onClick={()=>setMessage("")}><X size={13}/></button></p>}
    <div className={"qp-editor-layout"+(onlyPreview?" is-preview-only":"")}>
      {!onlyPreview&&<div className="qp-form-panel">
        <div className="qp-form-tabs">{([["details","Contenido"],["pricing","Precios"],["design","Identidad"]] as const).map(([key,label])=><button key={key} className={tab===key?"is-active":""} onClick={()=>setTab(key)}>{label}</button>)}</div>
        <div className="qp-form-content">
          {tab==="details"&&<div className="qp-form-section">
            <div className="qp-section-heading"><h2>Datos de la propuesta</h2><p>La información que verá el cliente.</p></div>
            <Field label="Título del proyecto"><input value={current.title} onChange={e=>patch({title:e.target.value})} placeholder="Ej. Producción de comercial cinematográfico"/></Field>
            <div className="qp-two-cols"><Field label="Número de cotización"><input value={current.number} onChange={e=>patch({number:e.target.value})}/></Field><Field label="Estado (manual)"><select value={current.status} onChange={e=>patch({status:e.target.value as ProposalDocument["status"]})}>{Object.entries(statusLabel).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field></div>
            <Field label="Cliente del CRM"><select value={current.clientId} onChange={e=>changeClient(e.target.value)}><option value="">Cliente libre / no vinculado</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Empresa o persona destinataria"><input value={current.clientName} onChange={e=>patch({clientName:e.target.value})}/></Field>
            <Field label="Persona de contacto"><input value={current.clientContact} onChange={e=>patch({clientContact:e.target.value})}/></Field>
            <div className="qp-two-cols"><Field label="Fecha de emisión"><input type="date" value={current.issueDate} onChange={e=>patch({issueDate:e.target.value})}/></Field><Field label="Vigencia hasta"><input type="date" value={current.validUntil} onChange={e=>patch({validUntil:e.target.value})}/></Field></div>
            <div className="qp-section-heading"><h2>Presentación y alcance</h2><p>Bloques de contenido reutilizables.</p></div>
            <Field label="Introducción"><Area value={current.introduction} change={v=>patch({introduction:v})}/></Field>
            <Field label="Alcance"><Area rows={4} value={current.scope} change={v=>patch({scope:v})} placeholder="Qué incluye el proyecto..."/></Field>
            <Field label="Entregables"><Area rows={4} value={current.deliverables} change={v=>patch({deliverables:v})} placeholder="Especificaciones, formatos, versiones, revisiones..."/></Field>
            <Field label="Cronograma"><Area value={current.timeline} change={v=>patch({timeline:v})} placeholder="Ej. Entrega inicial 10 días hábiles después del anticipo..."/></Field>
            <Field label="Condiciones comerciales"><Area rows={4} value={current.terms} change={v=>patch({terms:v})}/></Field>
            <Field label="Exclusiones"><Area value={current.exclusions} change={v=>patch({exclusions:v})}/></Field>
            <Field label="Notas adicionales"><Area value={current.notes} change={v=>patch({notes:v})}/></Field>
          </div>}
          {tab==="pricing"&&<div className="qp-form-section">
            <div className="qp-section-heading"><h2>Desglose de inversión</h2><p>Partidas editables; los importes se calculan automáticamente.</p></div>
            <div className="qp-two-cols"><Field label="Moneda"><select value={current.currency} onChange={e=>patch({currency:e.target.value as "MXN"|"USD"})}><option value="MXN">Pesos mexicanos (MXN)</option><option value="USD">Dólares (USD)</option></select></Field>
              <Field label="Impuesto (%)" hint="Defínelo según la operación y tu contador."><input type="number" min="0" max="100" step="0.01" value={current.taxPercent} onChange={e=>patch({taxPercent:Math.max(0,Math.min(100,Number(e.target.value)||0))})}/></Field></div>
            <div className="qp-items-list">{current.items.map((item,i)=><div key={item.id} className="qp-item-card">
              <div className="qp-item-head"><strong>Concepto {String(i+1).padStart(2,"0")}</strong><button className="qp-icon" aria-label="Eliminar concepto" onClick={()=>patch({items:current.items.filter(it=>it.id!==item.id)})}><Trash2 size={14}/></button></div>
              <Field label="Servicio / partida"><input value={item.description} onChange={e=>setItem(item.id,{description:e.target.value})} placeholder="Servicio"/></Field>
              <Field label="Detalle"><Area rows={2} value={item.details} change={v=>setItem(item.id,{details:v})} placeholder="Qué incluye esta partida..."/></Field>
              <div className="qp-item-values"><Field label="Cantidad"><input type="number" min="0" step="0.01" value={item.quantity} onChange={e=>setItem(item.id,{quantity:Math.max(0,Number(e.target.value)||0)})}/></Field>
                <Field label="Unidad"><input value={item.unit} onChange={e=>setItem(item.id,{unit:e.target.value})}/></Field>
                <Field label="Precio unitario"><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e=>setItem(item.id,{unitPrice:Math.max(0,Number(e.target.value)||0)})}/></Field></div>
              <div className="qp-item-subtotal"><span>Importe</span><strong>{moneyTag(Math.max(0,item.quantity)*Math.max(0,item.unitPrice),current.currency)}</strong></div>
            </div>)}</div>
            <button className="qp-add-item" onClick={()=>patch({items:[...current.items,newLineItem()]})}><Plus size={15}/> Agregar partida</button>
            <div className="qp-form-total"><div><span>Subtotal</span><strong>{moneyTag(totals.subtotal,current.currency)}</strong></div><div><span>Impuesto ({current.taxPercent}%)</span><strong>{moneyTag(totals.tax,current.currency)}</strong></div><div><span>Total</span><strong>{moneyTag(totals.total,current.currency)}</strong></div></div>
            <Field label="Anticipo (%)" hint="Propuesta comercial; no es un comprobante de pago."><input type="number" min="0" max="100" step="1" value={current.depositPercent} onChange={e=>patch({depositPercent:Math.max(0,Math.min(100,Number(e.target.value)||0))})}/></Field>
            {current.depositPercent>0&&<div className="qp-deposit-line"><span>Anticipo calculado</span><strong>{moneyTag(totals.deposit,current.currency)}</strong></div>}
          </div>}
          {tab==="design"&&<div className="qp-form-section">
            <div className="qp-section-heading"><h2>Diseño reutilizable</h2><p>Aplica una plantilla o modifica la identidad solo para esta propuesta.</p></div>
            <Field label="Plantilla"><select value={current.templateId} onChange={e=>useTemplate(e.target.value)}>{allTemplates.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></Field>
            <div className="qp-layout-selector"><button className={template.layout==="editorial"?"is-selected":""} onClick={()=>patchTemplate({layout:"editorial"})}><LayoutTemplate size={17}/><strong>Editorial</strong><small>Propuesta de alto impacto</small></button>
              <button className={template.layout==="classic"?"is-selected":""} onClick={()=>patchTemplate({layout:"classic"})}><ReceiptText size={17}/><strong>Minimal</strong><small>Enfoque en cifras</small></button></div>
            <label className="qp-checkbox"><input type="checkbox" checked={template.useBrandSheet} onChange={e=>patchTemplate({useBrandSheet:e.target.checked})}/><span><strong>Usar identidad aprobada del Brand Sheet</strong><small>Logo principal y color primario, si están registrados y aprobados.</small></span></label>
            {!template.useBrandSheet&&<>
              <Field label="Color de acento"><input type="color" value={hexColor(template.accentHex)} onChange={e=>patchTemplate({accentHex:e.target.value})}/></Field>
              <Field label="URL de logotipo"><input type="url" value={template.customLogoUrl.startsWith("data:")?"":template.customLogoUrl} placeholder="https://..." onChange={e=>patchTemplate({customLogoUrl:e.target.value})}/></Field>
              <button className="qp-upload-button" onClick={()=>uploadRef.current?.click()}><ImagePlus size={15}/> Subir logo ligero (máx. 150 KB)</button>
              <input type="file" ref={uploadRef} hidden accept="image/png,image/jpeg,image/webp" onChange={e=>{void loadLogo(e.target.files?.[0]);e.target.value="";}}/>
            </>}
            <div className="qp-section-heading"><h2>Datos del emisor</h2><p>Configura la firma comercial visible al pie de cada página.</p></div>
            <Field label="Leyenda bajo la marca"><input value={template.sellerTagline} onChange={e=>patchTemplate({sellerTagline:e.target.value})}/></Field>
            <Field label="Correo comercial"><input type="email" value={template.sellerEmail} onChange={e=>patchTemplate({sellerEmail:e.target.value})}/></Field>
            <Field label="Teléfono"><input value={template.sellerPhone} onChange={e=>patchTemplate({sellerPhone:e.target.value})}/></Field>
            <Field label="Dirección / información adicional"><Area rows={2} value={template.sellerAddress} change={v=>patchTemplate({sellerAddress:v})}/></Field>
            <button className="qp-primary" onClick={saveAsTemplate}><Save size={15}/> Guardar esta configuración como plantilla</button>
            <p className="qp-small-print">No se alterará el Brand Sheet original. Las plantillas quedan separadas por empresa y pueden aplicarse a futuras propuestas.</p>
          </div>}
          <div className="qp-form-bottom"><button className="qp-danger" onClick={deleteCurrent}><Trash2 size={14}/> Eliminar documento</button><span>Guardado en este navegador</span></div>
        </div>
      </div>}
      <aside className="qp-preview-pane">
        <div className="qp-preview-toolbar"><span>VISTA PREVIA · A4</span><span>Escala de pantalla; la impresión usa tamaño real</span></div>
        <Preview company={company} brand={brand} quote={current}/>
      </aside>
    </div>
  </div>;
}
