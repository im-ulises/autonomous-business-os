"use client";

import { useState } from "react";
import { ArrowUpRight, BookOpen, CheckCircle2, ExternalLink, FileImage, Palette, Plus, ShieldCheck, Type } from "lucide-react";
import { BrandSheet } from "@/app/components/BrandSheet";
import type { BrandGuide, BrandLogo, Client, Company } from "@/lib/types";

type Props = {
  company: Company;
  guide?: BrandGuide;
  onSave: (guide: BrandGuide) => void;
};

function getSafeLogoSrc(logo: BrandLogo): string {
  if (logo.dataUrl && /^data:image\/(png|jpeg|webp);base64,/.test(logo.dataUrl)) return logo.dataUrl;
  try {
    const url = new URL(logo.url);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch { return ""; }
}
function safeLink(value: string): string {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch { return ""; }
}

export function CompanyBrandSection({ company, guide, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const approvedColors = (guide?.colors ?? []).filter(item => item.approved);
  const pendingColors = (guide?.colors ?? []).filter(item => !item.approved);
  const approvedLogos = (guide?.logos ?? []).filter(item => item.approved);
  const pendingLogos = (guide?.logos ?? []).filter(item => !item.approved);
  const hasBrand = !!guide && (
    guide.colors.length > 0 || guide.logos.length > 0 ||
    !!guide.primaryFont || !!guide.secondaryFont || !!guide.guidelineUrl ||
    !!guide.toneOfVoice || !!guide.notes
  );

  // Adapter only: company guides are persisted by company ID, never as client records.
  const companyAsBrandSubject: Client = {
    id: company.id, companyId: company.id, name: company.name,
    description: company.description, industry: "",
    brandColor: company.accent || "#9e92b8",
    website: "", contactName: "", contactEmail: "", contactPhone: "",
    brandGuide: guide,
  };

  return <div className="cb-shell">
    <div className="cb-heading">
      <div>
        <span className="cb-eyebrow">IDENTIDAD CORPORATIVA</span>
        <h1>Brand Sheet</h1>
        <p>La identidad propia de {company.name}. Los Brand Sheets de tus clientes permanecen separados dentro de Proyectos → Clientes.</p>
      </div>
      <button type="button" className="cb-edit" onClick={() => setEditing(true)}>
        <Palette size={16}/>{hasBrand ? "Editar Brand Sheet" : "Crear Brand Sheet"}<ArrowUpRight size={15}/>
      </button>
    </div>

    <div className="cb-profile" style={{ ["--cb-accent" as string]: company.accent || "#998bb4" }}>
      <span className="cb-profile-monogram">{company.short || company.name.slice(0,2).toUpperCase()}</span>
      <div className="cb-profile-details">
        <span>EMPRESA / WORKSPACE</span>
        <h2>{company.name}</h2>
        <p>{company.description || "Agrega una descripción desde la configuración de la empresa."}</p>
      </div>
      <div className="cb-profile-status">
        <span><CheckCircle2 size={13}/> {approvedColors.length} colores aprobados</span>
        <span><CheckCircle2 size={13}/> {approvedLogos.length} logos aprobados</span>
      </div>
    </div>

    {!hasBrand && <div className="cb-start">
      <div className="cb-start-icon"><Palette size={24}/></div>
      <h2>Tu manual de identidad empieza aquí</h2>
      <p>Agrega la paleta oficial, referencias Pantone, variantes del logo, tipografías y reglas de uso de {company.name}. Los agentes podrán consumir la exportación una vez que la conectemos a Crobi.</p>
      <button type="button" onClick={() => setEditing(true)}><Plus size={16}/> Crear identidad de marca</button>
      <small>El color usado en el recuadro de empresa es decorativo y no cuenta como color aprobado.</small>
    </div>}

    {hasBrand && <div className="cb-grid">
      <section className="cb-panel cb-colors">
        <div className="cb-panel-head"><div><Palette size={17}/><h2>Paleta corporativa</h2></div><span>{approvedColors.length} aprobados · {pendingColors.length} pendientes</span></div>
        {approvedColors.length ? <div className="cb-swatches">
          {approvedColors.map(color => <div className="cb-swatch" key={color.id}>
            <div className="cb-color-preview" style={{ background: /^#[0-9a-fA-F]{6}$/.test(color.hex) ? color.hex : "#888888" }}/>
            <div><strong>{color.name}</strong><span>{color.role}</span><code>{color.hex.toUpperCase()}</code>{color.pantone && <small>Pantone {color.pantone}</small>}</div>
          </div>)}
        </div> : <p className="cb-placeholder">Todavía no hay colores aprobados. Registra los códigos oficiales dentro del editor.</p>}
        {pendingColors.length > 0 && <p className="cb-pending">{pendingColors.length} {pendingColors.length === 1 ? "color pendiente de aprobación" : "colores pendientes de aprobación"} — no deben usarse en entregables.</p>}
      </section>

      <section className="cb-panel cb-logos">
        <div className="cb-panel-head"><div><FileImage size={17}/><h2>Logos y variantes</h2></div><span>{approvedLogos.length} aprobados · {pendingLogos.length} pendientes</span></div>
        {approvedLogos.length ? <div className="cb-logo-grid">
          {approvedLogos.slice(0,6).map(logo => <div key={logo.id} className="cb-logo-card">
            <div className={"cb-logo-preview cb-logo-bg-" + logo.background}>
              {getSafeLogoSrc(logo) ? <img alt={logo.name} src={getSafeLogoSrc(logo)}/> : <FileImage size={24}/>}
            </div>
            <strong>{logo.name}</strong>
            <span>{logo.variant}</span>
          </div>)}
        </div> : <p className="cb-placeholder">Aún no hay variantes de logo aprobadas. Puedes agregar los originales y sus reglas de uso.</p>}
        {pendingLogos.length > 0 && <p className="cb-pending">{pendingLogos.length} {pendingLogos.length === 1 ? "logo pendiente" : "logos pendientes"} de aprobación.</p>}
      </section>

      <section className="cb-panel">
        <div className="cb-panel-head"><div><Type size={17}/><h2>Tipografía</h2></div></div>
        <div className="cb-text-row"><span>Principal</span><strong>{guide?.primaryFont || "Sin definir"}</strong></div>
        <div className="cb-text-row"><span>Secundaria</span><strong>{guide?.secondaryFont || "Sin definir"}</strong></div>
      </section>

      <section className="cb-panel">
        <div className="cb-panel-head"><div><ShieldCheck size={17}/><h2>Reglas de marca</h2></div></div>
        <div className="cb-text-row"><span>Tono de comunicación</span><p>{guide?.toneOfVoice || "Sin definir"}</p></div>
        <div className="cb-text-row"><span>Uso permitido</span><p>{guide?.dos || "Sin definir"}</p></div>
        <div className="cb-text-row"><span>Evitar</span><p>{guide?.donts || "Sin definir"}</p></div>
        {safeLink(guide?.guidelineUrl ?? "") && <a className="cb-manual-link" href={safeLink(guide?.guidelineUrl ?? "")} target="_blank" rel="noopener noreferrer"><BookOpen size={15}/> Abrir manual oficial <ExternalLink size={13}/></a>}
      </section>
    </div>}
    {hasBrand && <p className="cb-disclaimer">Los valores se guardan localmente en este navegador. La aprobación es manual; todavía no existe sincronización centralizada ni lectura automática por Crobi. Usa el botón «Editar Brand Sheet» para exportar un JSON estructurado para agentes.</p>}

    {editing && <BrandSheet
      key={company.id}
      scope="company"
      client={companyAsBrandSubject}
      onSave={updated => { if (updated.brandGuide) onSave(updated.brandGuide); }}
      onClose={() => setEditing(false)}
    />}
  </div>;
}
