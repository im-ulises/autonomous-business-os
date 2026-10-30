import type { Company, ProposalDocument, ProposalLineItem, ProposalTemplate } from "@/lib/types";

const date = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const safeQuoteNumber = (index: number) => "COT-" + String(index).padStart(4, "0");
export const quoteTemplatePresets = (company: Company): ProposalTemplate[] => {
  const basic: ProposalTemplate = {
    id: "preset-editorial-" + company.id, companyId: company.id,
    name: "Editorial", layout: "editorial", useBrandSheet: true,
    accentHex: "#29252D", customLogoUrl: "",
    sellerTagline: "Propuesta comercial", sellerAddress: "",
    sellerEmail: "", sellerPhone: "",
    defaultIntroduction: "Gracias por considerar nuestros servicios. Esta propuesta presenta el alcance, los entregables y las condiciones comerciales para su revisión.",
    defaultScope: "", defaultDeliverables: "", defaultTimeline: "",
    defaultTerms: "La ejecución comienza después de aceptar la propuesta y confirmar las condiciones acordadas.",
    defaultExclusions: "Cualquier trabajo fuera del alcance detallado se cotiza por separado.",
    defaultNotes: "", defaultCurrency: "MXN",
    defaultTaxPercent: 0, defaultDepositPercent: 0,
    createdAt: "2026-10-30T00:00:00.000Z",
  };
  return [basic, { ...basic, id:"preset-minimal-"+company.id, name:"Minimal", layout:"classic",
    defaultIntroduction:"Presentamos la siguiente cotización para su consideración." }];
};
export function generateProposal(company: Company, template: ProposalTemplate, index: number): ProposalDocument {
  const now = new Date().toISOString();
  return {
    id: uid(), companyId: company.id, templateId: template.id,
    number: safeQuoteNumber(index), title: "Nueva propuesta", status: "draft",
    clientId: "", clientName: "", clientContact: "",
    issueDate: date(), validUntil: "", currency: template.defaultCurrency,
    introduction: template.defaultIntroduction, scope: template.defaultScope,
    deliverables: template.defaultDeliverables, timeline: template.defaultTimeline,
    terms: template.defaultTerms, exclusions: template.defaultExclusions,
    notes: template.defaultNotes, taxPercent: template.defaultTaxPercent,
    depositPercent: template.defaultDepositPercent,
    items: [{ id:uid(), description:"Servicio", details:"", quantity:1, unit:"servicio", unitPrice:0 }],
    templateSnapshot:{...template}, createdAt:now, updatedAt:now,
  };
}
export function newLineItem(): ProposalLineItem {
  return { id:uid(), description:"", details:"", quantity:1, unit:"servicio", unitPrice:0 };
}
export function proposalTotals(quote: ProposalDocument) {
  const subtotal = quote.items.reduce((sum,item)=>
    sum + Math.max(0,Number(item.quantity)||0) * Math.max(0,Number(item.unitPrice)||0), 0);
  const tax = subtotal * Math.max(0,Math.min(100,Number(quote.taxPercent)||0)) / 100;
  const total = subtotal + tax;
  const deposit = total * Math.max(0,Math.min(100,Number(quote.depositPercent)||0)) / 100;
  return {subtotal,tax,total,deposit,balance:total-deposit};
}
export function money(n:number, currency:"MXN"|"USD") {
  return new Intl.NumberFormat("es-MX",{style:"currency",currency,maximumFractionDigits:2}).format(n);
}
export function hexColor(text:string) { return /^#[0-9a-fA-F]{6}$/.test(text)?text:"#302B35"; }
export function safeLogoSrc(url:string) {
  if (/^data:image\/(png|jpeg|webp);base64,/.test(url)) return url;
  try {
    const checked = new URL(url);
    return ["https:","http:"].includes(checked.protocol)?checked.toString():"";
  } catch { return ""; }
}
