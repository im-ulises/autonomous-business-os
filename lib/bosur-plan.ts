import type { Client, SoftwareMilestone, SoftwarePhase, SoftwareProject } from "@/lib/types";
import { applyBosurRepositoryReview } from "@/lib/bosur-review";

/**
 * Faithful, editable starter snapshot of the customer-facing
 * "BOSUR Operations — Plan de Trabajo v1 · Implementación" (Sep 2026),
 * based on BOSUR Fase 0 v0.4. Source: user-supplied 9-page PDF.
 *
 * The plan is NOT a delivery report. Every status is pending until the team
 * explicitly records observed progress; milestones are unchecked by default.
 */
export const BOSUR_PROJECT_ID = "bosur-operations-workplan-v1";
export const BOSUR_CLIENT_ID = "evo-client-bosur";

export const BOSUR_CLIENT: Client = {
  id: BOSUR_CLIENT_ID,
  companyId: "evo",
  name: "BOSUR",
  description: "Cliente de BOSUR Operations; implementación en La Nogalera y Fletes México según el Plan de Trabajo v1.",
  industry: "",
  brandColor: "#77859B", // workspace identifier, NOT a verified corporate color
  website: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

function milestone(code: string, title: string, deliverable: string): SoftwareMilestone {
  return {
    id: "bosur-" + code,
    title,
    deliverable,
    dueDate: "",
    done: false,
  };
}
type PhaseDefinition = {
  code: string;
  title: string;
  window: string;
  objective: string;
  demo: string;
  sourcePage: number;
  acceptance: string[];
  notes: string;
  milestones: Array<[string, string, string]>;
};
const definitions: PhaseDefinition[] = [
  {
    code: "m05", title: "M0.5 · Freeze", window: "2–4 días",
    objective: "Cerrar las decisiones mínimas de arranque: roles, primer workflow, criterios de validación y riesgos abiertos.",
    demo: "Roles, primer workflow, criterios de validación y riesgos abiertos documentados.",
    sourcePage: 4,
    acceptance: [
      "Mary queda definida como Supervisora General con responsabilidad sobre ambas plantas.",
      "Essly queda definida como responsable de higiene/calidad y seguimiento operativo en ambas plantas.",
      "Quedan documentados el primer workflow de temperatura, su criterio de validación y los riesgos abiertos.",
    ],
    notes: "Las decisiones de supervisión, higiene, workflows iniciales y referencia NOM-251 figuran como acordadas en la página 3. Esto no certifica el cierre técnico de M0.5.",
    milestones: [
      ["roles", "Confirmar roles operativos", "Mary: Supervisora General; Essly: higiene/calidad para La Nogalera y Fletes México."],
      ["flow", "Congelar el flujo inicial de temperatura", "Definir procedimiento, activo/equipo, frecuencia, responsables y criterios de excepción."],
      ["validation", "Acordar criterios de validación", "Operadores designados y escenarios de prueba iniciales en planta."],
      ["risks", "Registrar riesgos y decisiones abiertas", "Alcance base aprobado y riesgos rastreables para M1."],
    ],
  },
  {
    code: "m1", title: "M1 · BOSUR Alive", window: "Semanas 1–2",
    objective: "Demostrar un proceso completo y observable desde una tablet: tarea → captura → regla → excepción → correctiva → revisión → trazabilidad.",
    demo: "Temperatura → excepción → correctiva → revisión → audit log en staging y en al menos una tablet real.",
    sourcePage: 5,
    acceptance: [
      "La tarea de temperatura se crea/programa y aparece en la tablet correcta.",
      "La captura conserva usuario, planta, activo, hora y versión del procedimiento.",
      "Una lectura fuera de rango genera una excepción explicable, identificando regla y resultado.",
      "Mary o Essly puede revisar el pendiente, documentar o validar la correctiva y cerrar el caso.",
      "El historial reconstruye el evento completo y la demo corre en staging y en una tablet real.",
    ],
    notes: "Fuera de M1: diseño visual final, reportes ejecutivos avanzados, configuración de los 33 formatos, IoT físico, recetas (M6), reglas aún no validadas y capacidades de IA necesarias para operar. Página 5.",
    milestones: [
      ["access", "Operador ingresa y ve su tarea", "Tarea programada visible en la tablet correcta."],
      ["reading", "Captura temperatura con contexto", "Lectura y metadatos: usuario, planta, activo, hora y versión del procedimiento."],
      ["rules", "Evaluar reglas y detectar excepciones", "Lectura fuera de rango produce excepción trazable y explicable."],
      ["alert", "Notificar a Mary o Essly", "Pendiente de supervisión/higiene visible y atendible."],
      ["corrective", "Documentar acción correctiva", "Acción, responsable, evidencia y decisión registrados."],
      ["review", "Revisión y cierre del caso", "Mary/Essly valida la correctiva y cierra la excepción."],
      ["audit", "Reconstruir el audit log", "Historial de punta a punta verificable sin papel ni logs técnicos."],
      ["tablet", "Demo validada en staging y tablet", "Ejecución completa con usuario real y al menos una tablet física."],
    ],
  },
  {
    code: "m2", title: "M2 · Process Engine", window: "Semanas 3–5",
    objective: "Construir el núcleo configurable y versionado para no convertir los 33 formatos en 33 aplicaciones.",
    demo: "Crear/configurar limpieza mediante el mismo motor, sin programar una pantalla especial.",
    sourcePage: 6,
    acceptance: ["Un workflow de limpieza utiliza tareas, reglas, evidencia, aprobaciones y cierre mediante componentes reutilizables."],
    notes: "El documento identifica seis componentes base: Template/Version, Fields/Rules, Schedule/Tasks, Submission/Evidence, Approval/Corrective Action y Audit Event.",
    milestones: [
      ["templates", "Template / Version", "Definir procedimientos con versiones vigentes e históricas."],
      ["fields", "Fields / Rules", "Campos configurables, validaciones, umbrales y reglas de negocio."],
      ["schedule", "Schedule / Tasks", "Frecuencias, responsables, vencimientos, ventanas y ocurrencias."],
      ["submissions", "Submission / Evidence", "Capturas, mediciones, fotos, firmas y observaciones."],
      ["approval", "Approval / Corrective Action", "Flujo de revisión, excepciones, responsables, evidencias y cierre."],
      ["events", "Audit Event", "Trazabilidad de quién hizo qué, cuándo y sobre qué entidad."],
      ["cleaning", "Validar segundo workflow: Limpieza", "Limpieza configurada en el motor compartido, sin una mini-aplicación nueva."],
    ],
  },
  {
    code: "m3", title: "M3 · Critical Operations", window: "Semanas 5–8",
    objective: "Habilitar procesos críticos de operación diaria sobre el motor común.",
    demo: "Temperaturas + limpieza + recepción + higiene funcionando con captura, reglas y revisión.",
    sourcePage: 6,
    acceptance: [
      "Cuatro procesos críticos disponibles en el mismo sistema.",
      "Validación semanal en planta con usuarios reales para observar fricción, tiempos y errores.",
    ],
    notes: "El orden Temperaturas → Limpieza → Recepción → Higiene es preliminar; las sesiones semanales ajustan la experiencia antes del piloto formal.",
    milestones: [
      ["temperature", "Temperaturas", "Workflow diario de mediciones y captura operativa."],
      ["cleaning", "Limpieza", "Procedimientos recurrentes con evidencia y tareas."],
      ["reception", "Recepción", "Formulario por evento, evidencia y revisión."],
      ["hygiene", "Higiene", "Flujo de higiene/calidad operativo."],
      ["plant", "Validación semanal en planta", "Hallazgos y simplificaciones con Mary, Essly y operadores."],
    ],
  },
  {
    code: "m4", title: "M4 · Incidents & Compliance", window: "Semanas 8–11",
    objective: "Implementar excepciones, acciones correctivas y reglas de cumplimiento validadas.",
    demo: "Incidente completo trazable y primeras reglas de cumplimiento verificadas.",
    sourcePage: 7,
    acceptance: [
      "El incidente conserva responsable, fecha compromiso, evidencia, verificación y escalamiento.",
      "Los criterios específicos de cumplimiento se validan con BOSUR antes de parametrizar reglas.",
    ],
    notes: "NOM-251-SSA1-2009 se usa como referencia de prácticas de higiene, no como sustituto de criterios operativos específicos validados por BOSUR.",
    milestones: [
      ["incident", "Registrar y dar seguimiento a incidentes", "Excepción/incidente con trazabilidad completa."],
      ["corrective", "Acciones correctivas y fechas compromiso", "Responsables, evidencia y compromisos verificables."],
      ["escalation", "Verificación y escalamiento", "Flujo de validación y escalamiento de incidentes."],
      ["criteria", "Validar criterios de cumplimiento", "Reglas NOM-251 relevantes parametrizadas solo tras validación con BOSUR."],
    ],
  },
  {
    code: "m5", title: "M5 · Audit Ready", window: "Semanas 10–13",
    objective: "Anticipar faltantes de evidencia por planta y periodo antes de la auditoría.",
    demo: "Vista de preparación de auditoría y expediente exportable.",
    sourcePage: 7,
    acceptance: ["Se identifican requisitos, evidencia disponible, firmas pendientes y correctivas abiertas por planta y periodo."],
    notes: "El valor principal es detectar faltantes y pendientes antes de la auditoría, no solo generar PDFs.",
    milestones: [
      ["requirements", "Matriz de requisitos por planta y periodo", "Visibilidad de controles requeridos para la auditoría."],
      ["evidence", "Evidencia disponible y faltantes", "Listado accionable de evidencias y documentos ausentes."],
      ["pending", "Firmas y correctivas pendientes", "Pendientes visibles y priorizados para preparación de auditoría."],
      ["export", "Expediente de auditoría exportable", "Exportación de expediente y vista Audit Ready."],
    ],
  },
  {
    code: "m6", title: "M6 · Recetas & Planeación", window: "Semanas 11–14",
    objective: "Estandarizar recetas, rendimientos, mermas, costos y planeación de demanda.",
    demo: "Menú + comensales → necesidades consolidadas de materia prima + costo esperado.",
    sourcePage: 7,
    acceptance: ["La planeación relaciona menús y comensales proyectados con insumos consolidados y costos esperados."],
    notes: "Se implementa antes de IoT. No convierte BOSUR en un ERP (página 9).",
    milestones: [
      ["recipes", "Catálogo y configuración de recetas", "Ingredientes, unidades y recetas estandarizadas."],
      ["yield", "Rendimientos y mermas", "Parámetros para rendimientos, mermas y costos de recetas."],
      ["demand", "Menús y comensales proyectados", "Planeación de demanda por menú y población esperada."],
      ["materials", "Necesidades de materia prima y costo esperado", "Consolidación de insumos y cálculo de costo esperado."],
    ],
  },
  {
    code: "m7", title: "M7 · IoT", window: "Semanas 13–16",
    objective: "Automatizar mediciones repetitivas con retorno operacional y sin dependencia de un proveedor.",
    demo: "Sensor → telemetría → regla → alerta → historial.",
    sourcePage: 7,
    acceptance: ["Los datos de sensores se normalizan en BOSUR y aplican reglas sin acoplar el negocio a un fabricante."],
    notes: "La selección física e inventario final de sensores se posponen hasta su validación; empezar con pocos puntos de alto ROI.",
    milestones: [
      ["assets", "Validación de activos y rangos físicos", "Selección priorizada de activos/sensores por retorno."],
      ["telemetry", "Ingesta y normalización de telemetría", "Interfaz independiente del fabricante para datos IoT."],
      ["alerts", "Medición → regla → alerta → historial", "Ciclo completo verificable de sensor a trazabilidad."],
    ],
  },
  {
    code: "m8", title: "M8 · Pilot", window: "Semanas 16–18",
    objective: "Validar operación formal sostenida en La Nogalera y Fletes México.",
    demo: "Operadores trabajando con BOSUR de forma sostenida en ambas plantas.",
    sourcePage: 7,
    acceptance: ["Se evalúan tiempos de tarea, errores, cumplimiento, adopción y excepciones reales en las dos plantas."],
    notes: "Esta etapa verifica adopción real, no una demostración aislada.",
    milestones: [
      ["nogalera", "Piloto en La Nogalera", "Uso formal por los usuarios operativos designados."],
      ["fletes", "Piloto en Fletes México", "Uso formal por los usuarios operativos designados."],
      ["metrics", "Medir adopción, tiempos y errores", "Indicadores de uso, cumplimiento y excepciones reales."],
      ["feedback", "Validar hallazgos y ajustes", "Mejoras priorizadas según la operación observada."],
    ],
  },
  {
    code: "m9", title: "M9 · Production", window: "Semanas 18–20",
    objective: "Puesta en producción, hardening, capacitación y rollout estable.",
    demo: "Producción estable + restauración probada + documentación mínima.",
    sourcePage: 7,
    acceptance: [
      "Ante pérdida de internet, capturas compatibles quedan protegidas localmente y sincronizan con la hora real.",
      "Usuarios sin permisos reciben denegación y el evento relevante es auditado.",
      "Reintentos no duplican registros ni correctivas.",
      "Se prueba la restauración de respaldos, no solo la generación.",
      "Los registros históricos mantienen la versión del procedimiento vigente al capturar.",
      "Documentación mínima, capacitación y validación de staging/producción realizadas.",
    ],
    notes: "La ventana adicional de semanas 20–24 queda reservada para estabilización, ajustes razonables y correcciones por operación real, validaciones o disponibilidad de hardware.",
    milestones: [
      ["offline", "Conectividad y sincronización resilientes", "Protección local de captura compatible y sincronización con fecha/hora original."],
      ["permissions", "Permisos y auditoría de acceso", "Acceso denegado correctamente y evento auditado."],
      ["retries", "Reintentos e idempotencia", "Sin registros o correctivas duplicadas al reintentar."],
      ["backup", "Respaldo y restauración", "Restore ejecutado y verificado de manera controlada."],
      ["versions", "Versiones históricas de procedimientos", "Capturas conservan la versión vigente en su fecha."],
      ["operations", "Observabilidad, monitoreo y sensores desconectados", "Monitoreo de evidencias, integridad, alertas y errores."],
      ["training", "Capacitación y documentación", "Usuarios preparados y documentación mínima entregada."],
      ["stability", "Estabilización (semanas 20–24)", "Ajustes y correcciones derivados de la operación real dentro del alcance."],
    ],
  },
];

export const BOSUR_SOFTWARE_PROJECT: SoftwareProject = {
  id: BOSUR_PROJECT_ID,
  companyId: "evo",
  name: "BOSUR Operations",
  description: "Plataforma operativa tablet-first para bitácoras, trazabilidad y procesos de higiene/calidad en La Nogalera y Fletes México.",
  clientId: BOSUR_CLIENT_ID,
  owner: "",
  stack: "Backend central · PostgreSQL · tablet-first · almacenamiento de evidencias · audit events",
  repoUrl: "",
  specUrl: "",
  startDate: "",
  targetDate: "",
  status: "planning", // status of imported plan, not a claim about real project progress
  phases: definitions.map(({ code, title, objective, window, demo, sourcePage, acceptance, notes, milestones }): SoftwarePhase => ({
    id: "bosur-phase-" + code,
    title,
    description: objective,
    window,
    demo,
    sourcePage,
    acceptanceCriteria: acceptance,
    status: "pending",
    milestones: milestones.map(([part, label, output]) => milestone(code + "-" + part, label, output)),
    notes,
  })),
  nextAction: "Confirmar datos mínimos del workflow de temperatura y criterios de excepción; preparar entornos y validar M0.5/M1 con Mary, Essly y operadores.",
  notes: "FUENTE: BOSUR Operations — Plan de Trabajo v1 · Implementación, septiembre 2026. Basado en BOSUR Fase 0 v0.4. Ventana comercial 4–6 meses; roadmap M0.5 + M1–M9, con semanas 20–24 para estabilización. Las ventanas son guías ajustables; los estados y casillas permanecen sin confirmar hasta registrar evidencia. Principio: motor configurable, reglas críticas determinísticas, validación temprana en planta e inteligencia desacoplada.",
  sourceName: "BOSUR — Plan de Trabajo v1 · Implementación",
  sourceVersion: "Septiembre 2026 · Cliente v1 · Fase 0 v0.4",
  commercialWindow: "4–6 meses",
  createdAt: "2026-10-30T00:00:00.000Z",
  updatedAt: "2026-10-30T00:00:00.000Z",
};

/** One-time non-destructive import into local UI state. */
export function ensureBosurWorkspace<T extends { clients: Client[]; softwareProjects: SoftwareProject[] }>(current: T): T {
  const existingClient = current.clients.find(
    client => client.companyId === "evo" && client.name.trim().toLowerCase() === "bosur"
  );
  const clients = existingClient || current.clients.some(client => client.id === BOSUR_CLIENT_ID)
    ? current.clients
    : [...current.clients, BOSUR_CLIENT];
  const linkedId = existingClient?.id ?? BOSUR_CLIENT_ID;
  const old = current.softwareProjects.find(project =>
    project.id === BOSUR_PROJECT_ID ||
    (project.companyId === "evo" && project.name.trim().toLowerCase() === "bosur operations")
  );
  if (!old) {
    return {
      ...current, clients,
      softwareProjects: [applyBosurRepositoryReview({ ...BOSUR_SOFTWARE_PROJECT, clientId: linkedId }), ...current.softwareProjects],
    };
  }
  if (old.repositoryReview?.version === "bosur-repo-audit-2026-10-30-v1") {
    return { ...current, clients };
  }
  const reviewed = applyBosurRepositoryReview({ ...old, clientId: old.clientId || linkedId });
  return {
    ...current, clients,
    softwareProjects: current.softwareProjects.map(project =>
      project === old ? { ...reviewed, updatedAt: new Date().toISOString() } : project
    ),
  };
}
