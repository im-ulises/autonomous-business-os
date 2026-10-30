import type { Company, Mission, Project } from "./types";

export const demoCompanies: Company[] = [
  { id: "evo", name: "EVO Studios", short: "EV", description: "Producción cinematográfica, IA y servicios digitales", accent: "#bca7ff", demo: true },
  { id: "barrier", name: "Barrera MX", short: "BM", description: "Protección modular contra inundaciones", accent: "#ffb076", demo: true },
  { id: "crobi", name: "Crobi", short: "CR", description: "Infraestructura para agentes gobernados", accent: "#87c4f5", demo: true },
];

export const demoProjects: Project[] = [
  { id: "sample-bigmedia", companyId: "evo", name: "Big Media — Sitio web", description: "Diseño, contenidos y gestión de cambios", stage: "active", createdAt: "2026-10-29", demo: true },
  { id: "sample-quality", companyId: "evo", name: "Quality Homes — Comerciales", description: "Producción audiovisual y narrativa", stage: "waiting", createdAt: "2026-10-29", demo: true },
  { id: "sample-cota", companyId: "barrier", name: "Landing y distribución", description: "Sitio, precios y cadena de suministro", stage: "planning", createdAt: "2026-10-29", demo: true },
];

export const demoMissions: Mission[] = [
  { id: "sample-task-1", companyId: "evo", projectId: "sample-bigmedia", title: "Validar cambios del sitio Big Media", outcome: "Preparar PR con pruebas y evidencia", assignee: "claude", status: "planned", createdAt: "2026-10-29", demo: true },
  { id: "sample-task-2", companyId: "barrier", projectId: "sample-cota", title: "Analizar alternativas de distribución", outcome: "Informe de costos, riesgos y opciones", assignee: "grok", status: "planned", createdAt: "2026-10-29", demo: true },
];

export const sampleDocs = [
  { id: "overview", name: "Business OS — Overview", path: "overview.md", companyId: "all", category: "Fundamentos" },
  { id: "engineering", name: "Engineering — Playbook", path: "engineering-playbook.md", companyId: "evo", category: "Procesos" },
  { id: "knowledge-contract", name: "Docs — Contrato de conocimiento", path: "knowledge-contract.md", companyId: "all", category: "Arquitectura" },
];
