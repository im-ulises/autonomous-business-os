"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownToLine, ArrowLeft, Check, CheckCircle2, ExternalLink, FileImage, ImagePlus, Palette, Plus, ShieldCheck, Trash2, Type, X } from "lucide-react";
import type { BrandColor, BrandGuide, BrandLogo, Client } from "@/lib/types";

const EMPTY_GUIDE: BrandGuide = {
  colors: [], logos: [], primaryFont: "", secondaryFont: "", toneOfVoice: "",
  dos: "", donts: "", notes: "", guidelineUrl: "", reviewedBy: "",
};
const roles: { value: BrandColor["role"]; label: string }[] = [
  { value: "primary", label: "Primario" }, { value: "secondary", label: "Secundario" },
  { value: "accent", label: "Acento" }, { value: "neutral", label: "Neutro" },
  { value: "background", label: "Fondo" },
];
const variants: { value: BrandLogo["variant"]; label: string }[] = [
  { value: "primary", label: "Principal" }, { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" }, { value: "monochrome", label: "Monocromático" },
  { value: "inverse", label: "Negativo / claro" }, { value: "icon", label: "Isotipo" },
  { value: "other", label: "Otro" },
];
const makeId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const toHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : "#888888";
const rgb = (hex: string) => {
  const value = toHex(hex);
  return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16)).join(", ");
};
const approved = (item: { approved: boolean }) => item.approved;
function validUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch { return ""; }
}
const logoSrc = (item: BrandLogo) => {
  if (item.dataUrl && /^data:image\/(png|jpeg|webp);base64,/.test(item.dataUrl)) return item.dataUrl;
  return validUrl(item.url);
};

type Props = { client: Client; onSave: (client: Client) => void; onClose: () => void; scope?: "client" | "company" };

export function BrandSheet({ client, onSave, onClose, scope = "client" }: Props) {
  const [guide, setGuide] = useState<BrandGuide>(() => ({
    ...EMPTY_GUIDE, ...client.brandGuide,
    colors: [...(client.brandGuide?.colors ?? [])],
    logos: [...(client.brandGuide?.logos ?? [])],
  }));
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Brand Sheet is an app-level dialog, not part of the page content.
    // Lock the document while open and restore on unmount.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", escape, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", escape, true);
    };
  }, [onClose]);

  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const approvedColors = guide.colors.filter(approved).length;
  const approvedLogos = guide.logos.filter(approved).length;
  const setGuideField = (changes: Partial<BrandGuide>) => {
    setGuide(current => ({ ...current, ...changes, reviewedAt: undefined }));
    setDirty(true);
    setMessage("");
  };
  const changeColor = (id: string, changes: Partial<BrandColor>) => {
    setGuideField({ colors: guide.colors.map(color => color.id === id ? { ...color, ...changes } : color) });
  };
  const addColor = () => {
    setGuideField({ colors: [...guide.colors, { id: makeId(), name: "Nuevo color", role: "accent", hex: "#888888", pantone: "", cmyk: "", approved: false }] });
  };
  const changeLogo = (id: string, changes: Partial<BrandLogo>) => {
    setGuideField({ logos: guide.logos.map(logo => logo.id === id ? { ...logo, ...changes } : logo) });
  };
  const addLogo = () => {
    if (guide.logos.length >= 10) return setMessage("Máximo 10 variantes de logo en esta demo.");
    setGuideField({ logos: [...guide.logos, { id: makeId(), name: "Nueva versión", variant: "primary", background: "any", usage: "", url: "", approved: false }] });
  };
  async function uploadLogo(logo: BrandLogo, file?: File) {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) return setMessage("Solo se admiten PNG, JPG o WebP. No se admite SVG activo en la demo.");
    if (file.size > 160 * 1024) return setMessage("El archivo supera 160 KB. Usa una URL HTTPS para el original en alta resolución.");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(Error("Imagen no válida"));
        reader.onerror = () => reject(Error("Archivo ilegible"));
        reader.readAsDataURL(file);
      });
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) throw Error("Formato no admitido");
      changeLogo(logo.id, { dataUrl, fileName: file.name, url: "" });
      setMessage("Vista previa local guardada en el editor. Guarda el Brand Sheet para conservarla.");
    } catch {
      setMessage("No se pudo leer la imagen.");
    }
  }
  function downloadJson() {
    const exportData = {
      format: "autonomous-business-os.brand-sheet.v1",
      export_status: "local_editor_not_cryptographically_verified",
      subject_type: scope,
      ...(scope === "company"
        ? { company: { id: client.id, name: client.name, description: client.description } }
        : { client: { id: client.id, companyId: client.companyId, name: client.name, description: client.description, industry: client.industry } }),
      reviewed_manually_by: guide.reviewedBy || null,
      approved_colors: guide.colors.filter(item => item.approved).map(item => ({
        name: item.name, role: item.role, hex: toHex(item.hex),
        rgb: rgb(item.hex), pantone_official_manual: item.pantone || null, cmyk_official_manual: item.cmyk || null,
      })),
      pending_colors: guide.colors.filter(item => !item.approved).map(item => ({
        name: item.name, role: item.role, hex: toHex(item.hex), pantone_official_manual: item.pantone || null,
      })),
      approved_logos: guide.logos.filter(item => item.approved).map(item => ({
        name: item.name, variant: item.variant, background: item.background, usage: item.usage,
        source_url: validUrl(item.url) || null, embedded_image_data_url: item.dataUrl || null, fileName: item.fileName || null,
      })),
      pending_logo_variants: guide.logos.filter(item => !item.approved).map(item => ({ name: item.name, variant: item.variant })),
      typography: { primary: guide.primaryFont || null, secondary: guide.secondaryFont || null },
      voice: guide.toneOfVoice, usage: { do: guide.dos, avoid: guide.donts, notes: guide.notes },
      reference_manual: validUrl(guide.guidelineUrl) || null,
      instruction: "Use only manually approved colors and logo variants. Never infer official Pantone codes. All data requires human confirmation before production.",
    };
    const file = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brand-sheet-" + client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function saveGuide() {
    if (guide.colors.some(color => !/^#[0-9a-fA-F]{6}$/.test(color.hex))) {
      setMessage("Corrige los valores HEX: deben tener el formato #RRGGBB.");
      return;
    }
    const totalImageSize = guide.logos.reduce((sum, logo) => sum + (logo.dataUrl?.length ?? 0), 0);
    if (totalImageSize > 1_200_000) {
      setMessage("Los logos son demasiado grandes para guardarlos en este navegador. Usa URLs de archivos originales.");
      return;
    }
    const reviewed = guide.reviewedBy.trim() ? { ...guide, reviewedAt: new Date().toISOString() } : { ...guide, reviewedAt: undefined };
    try {
      onSave({ ...client, brandGuide: reviewed });
      setGuide(reviewed);
      setDirty(false);
      setMessage("Brand Sheet guardado localmente. No está conectado todavía a un repositorio de marca.");
    } catch {
      setMessage("No se pudo guardar. Revisa el espacio de almacenamiento del navegador.");
    }
  }
  // Portaling to the app shell makes the overlay a sibling of the sticky sidebar.
  // The content panel has its own view-transition stacking context, which
  // otherwise traps this dialog underneath the navigation, regardless of z-index.
  const appShell = typeof document !== "undefined" ? document.querySelector(".simple-shell") : null;
  const dialog = <div className="bs-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="bs-dialog" role="dialog" aria-modal="true" aria-label={"Brand Sheet de " + client.name}>
      <header className="bs-topbar">
        <div className="bs-heading">
          <button ref={closeButtonRef} type="button" className="bs-icon-btn" onClick={onClose} aria-label="Cerrar Brand Sheet"><ArrowLeft size={19}/></button>
          <div><span>{scope === "company" ? "EMPRESA / IDENTIDAD CORPORATIVA" : "CLIENTE / IDENTIDAD DE MARCA"}</span><h2>{client.name} <small>Brand Sheet</small></h2></div>
        </div>
        <div className="bs-top-actions">
          <span className="bs-status">{approvedColors} colores · {approvedLogos} logos aprobados manualmente</span>
          <button type="button" className="bs-export" onClick={downloadJson}><ArrowDownToLine size={15}/> Exportar para agentes</button>
          <button type="button" className="bs-save" onClick={saveGuide}><Check size={15}/> Guardar cambios</button>
          <button type="button" className="bs-icon-btn bs-close" onClick={onClose} aria-label="Cerrar"><X size={18}/></button>
        </div>
      </header>
      <div className="bs-scroll">
        <div className="bs-hero">
          <div className="bs-client-emblem" style={{ background: client.brandColor }}><Palette size={29}/></div>
          <div><span>MANUAL DE MARCA · BORRADOR LOCAL</span><h3>{client.name}</h3><p>Una fuente de identidad para diseños, contenido y agentes. Los valores oficiales deben cargarse desde el manual de marca aprobado.</p></div>
          <div className="bs-hero-stats"><strong>{guide.colors.length}</strong><span>Colores</span><strong>{guide.logos.length}</strong><span>Logos</span></div>
        </div>
        <div className="bs-layout">
          <div className="bs-primary">
            <section className="bs-panel">
              <div className="bs-section-head">
                <div><span className="bs-section-icon"><Palette size={17}/></span><div><h4>Paleta corporativa</h4><p>HEX, RGB calculado y referencias Pantone/CMYK oficiales escritas manualmente.</p></div></div>
                <button type="button" className="bs-add" onClick={addColor}><Plus size={15}/> Agregar color</button>
              </div>
              <div className="bs-color-grid">
                {guide.colors.map(color => <div key={color.id} className="bs-swatch">
                  <div className="bs-swatch-preview" style={{ background: toHex(color.hex) }}><span>{color.name}</span></div>
                  <div className="bs-swatch-fields">
                    <div className="bs-row">
                      <label className="bs-field bs-grow">Nombre<input maxLength={60} value={color.name} onChange={event => changeColor(color.id, { name: event.target.value })}/></label>
                      <label className="bs-field">Tipo<select value={color.role} onChange={event => changeColor(color.id, { role: event.target.value as BrandColor["role"] })}>{roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
                    </div>
                    <div className="bs-row bs-color-row">
                      <label className="bs-field">HEX<input maxLength={7} spellCheck={false} value={color.hex} onChange={event => changeColor(color.id, { hex: event.target.value })}/></label>
                      <label className="bs-field bs-grow">Pantone exacto<input maxLength={40} value={color.pantone} onChange={event => changeColor(color.id, { pantone: event.target.value })} placeholder="Sin verificar"/></label>
                      <label className="bs-field bs-hex-picker">Color<input type="color" value={toHex(color.hex)} onChange={event => changeColor(color.id, { hex: event.target.value })}/></label>
                    </div>
                    <div className="bs-row">
                      <label className="bs-field bs-grow">CMYK oficial (manual)<input maxLength={48} value={color.cmyk} onChange={event => changeColor(color.id, { cmyk: event.target.value })} placeholder="Ej. C:… M:… Y:… K:…"/></label>
                      <span className="bs-rgb">RGB<br/>{rgb(color.hex)}</span>
                    </div>
                    <div className="bs-swatch-footer"><label><input type="checkbox" checked={color.approved} onChange={event => changeColor(color.id, { approved: event.target.checked })}/> Aprobado manualmente</label><button type="button" onClick={() => setGuideField({ colors: guide.colors.filter(item => item.id !== color.id) })} aria-label={"Eliminar " + color.name}><Trash2 size={15}/></button></div>
                  </div>
                </div>)}
                {guide.colors.length === 0 && <div className="bs-empty-colors"><Palette size={23}/><strong>Sin colores oficiales registrados</strong><p>Agrega cada tono de tu manual de marca. No se infieren Pantone a partir del HEX.</p><button type="button" onClick={addColor}>Agregar primer color <Plus size={15}/></button></div>}
              </div>
            </section>
            <section className="bs-panel">
              <div className="bs-section-head">
                <div><span className="bs-section-icon"><FileImage size={18}/></span><div><h4>Familia de logos</h4><p>Versiones, fondos permitidos y archivos de referencia para producción.</p></div></div>
                <button type="button" className="bs-add" onClick={addLogo}><Plus size={15}/> Añadir variante</button>
              </div>
              <div className="bs-logo-grid">
                {guide.logos.map(logo => <div key={logo.id} className="bs-logo-item">
                  <div className={"bs-logo-preview bs-logo-preview-" + logo.background}>
                    {logoSrc(logo) ? <img src={logoSrc(logo)} alt={logo.name} /> : <div><ImagePlus size={23}/><span>Sin logo adjunto</span></div>}
                  </div>
                  <div className="bs-logo-fields">
                    <label className="bs-field">Nombre<input maxLength={70} value={logo.name} onChange={event => changeLogo(logo.id, { name: event.target.value })}/></label>
                    <div className="bs-row">
                      <label className="bs-field bs-grow">Versión<select value={logo.variant} onChange={event => changeLogo(logo.id, { variant: event.target.value as BrandLogo["variant"] })}>{variants.map(variant => <option key={variant.value} value={variant.value}>{variant.label}</option>)}</select></label>
                      <label className="bs-field bs-grow">Fondo<select value={logo.background} onChange={event => changeLogo(logo.id, { background: event.target.value as BrandLogo["background"] })}><option value="any">Cualquiera</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
                    </div>
                    <label className="bs-field">URL HTTPS del archivo original<input type="url" placeholder="https://..." value={logo.url} onChange={event => changeLogo(logo.id, { url: event.target.value, dataUrl: undefined, fileName: undefined })}/></label>
                    <label className="bs-field">Reglas de uso<input maxLength={220} placeholder="Ej. fondo blanco, área de protección" value={logo.usage} onChange={event => changeLogo(logo.id, { usage: event.target.value })}/></label>
                    <div className="bs-logo-actions">
                      <label className="bs-upload">Cargar preview (≤160 KB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { void uploadLogo(logo, event.target.files?.[0]); event.target.value = ""; }}/></label>
                      <label className="bs-approval"><input type="checkbox" checked={logo.approved} onChange={event => changeLogo(logo.id, { approved: event.target.checked })}/> Aprobado</label>
                      <button type="button" aria-label={"Eliminar " + logo.name} onClick={() => setGuideField({ logos: guide.logos.filter(item => item.id !== logo.id) })}><Trash2 size={15}/></button>
                    </div>
                    {logo.fileName && <small className="bs-filename">{logo.fileName} · preview local</small>}
                  </div>
                </div>)}
                {guide.logos.length === 0 && <div className="bs-empty-colors"><ImagePlus size={23}/><strong>Aún no hay archivos de logo</strong><p>Registra original, horizontal, negativo, isotipo o las variantes que utilice el cliente.</p><button type="button" onClick={addLogo}>Añadir primera variante <Plus size={15}/></button></div>}
              </div>
            </section>
          </div>
          <aside className="bs-secondary">
            <section className="bs-panel">
              <div className="bs-section-head"><div><span className="bs-section-icon"><Type size={17}/></span><div><h4>Tipografía</h4><p>Familias aprobadas por marca</p></div></div></div>
              <label className="bs-field">Fuente principal<input value={guide.primaryFont} onChange={event => setGuideField({ primaryFont: event.target.value })} placeholder="Nombre oficial"/></label>
              <label className="bs-field">Fuente secundaria<input value={guide.secondaryFont} onChange={event => setGuideField({ secondaryFont: event.target.value })} placeholder="Nombre oficial"/></label>
              <p className="bs-note">Las fuentes deben tener sus licencias y pesos documentados por separado.</p>
            </section>
            <section className="bs-panel">
              <div className="bs-section-head"><div><span className="bs-section-icon"><ShieldCheck size={18}/></span><div><h4>Uso de marca</h4><p>Contexto reutilizable para agentes</p></div></div></div>
              <label className="bs-field">Tono de comunicación<textarea rows={3} value={guide.toneOfVoice} onChange={event => setGuideField({ toneOfVoice: event.target.value })} placeholder="Ej. institucional, directo, aspiracional..."/></label>
              <label className="bs-field">Qué sí hacer<textarea rows={3} value={guide.dos} onChange={event => setGuideField({ dos: event.target.value })} placeholder="Aplicaciones y combinaciones aceptadas"/></label>
              <label className="bs-field">Qué evitar<textarea rows={3} value={guide.donts} onChange={event => setGuideField({ donts: event.target.value })} placeholder="Restricciones, deformaciones, usos no permitidos"/></label>
              <label className="bs-field">Notas creativas<textarea rows={3} value={guide.notes} onChange={event => setGuideField({ notes: event.target.value })} placeholder="Estilo fotográfico, tratamiento, referencias..."/></label>
              <label className="bs-field">Manual oficial (URL HTTPS)<input type="url" value={guide.guidelineUrl} onChange={event => setGuideField({ guidelineUrl: event.target.value })} placeholder="https://..."/></label>
              {validUrl(guide.guidelineUrl) && <a className="bs-guideline-link" href={validUrl(guide.guidelineUrl)} target="_blank" rel="noopener noreferrer">Abrir manual oficial <ExternalLink size={13}/></a>}
            </section>
            <section className="bs-panel bs-review-panel">
              <div className="bs-section-head"><div><span className="bs-section-icon"><CheckCircle2 size={18}/></span><div><h4>Revisión humana</h4><p>Control básico de la demo</p></div></div></div>
              <label className="bs-field">Revisado por (persona/equipo)<input maxLength={100} value={guide.reviewedBy} onChange={event => setGuideField({ reviewedBy: event.target.value })} placeholder="Sin verificar"/></label>
              <div className="bs-review-counts"><span>{approvedColors} / {guide.colors.length} colores</span><span>{approvedLogos} / {guide.logos.length} logos</span></div>
              <p>Marcar «aprobado» significa una revisión manual, no una autorización auditada. Un agente solo debería usar los elementos marcados como aprobados.</p>
            </section>
          </aside>
        </div>
        <div className="bs-footer">
          <div><span>{dirty ? "Cambios sin guardar" : "Editor local"}</span><p>La exportación JSON separa lo aprobado de lo pendiente. Crobi todavía no lee automáticamente este Brand Sheet.</p></div>
          <div>{message && <span className="bs-message" role="status">{message}</span>}<button type="button" className="bs-save" onClick={saveGuide}>Guardar Brand Sheet</button></div>
        </div>
      </div>
    </section>
  </div>;
  return appShell ? createPortal(dialog, appShell) : dialog;
}
