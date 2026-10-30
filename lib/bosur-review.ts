import type { SoftwareMilestone, SoftwareProject } from "@/lib/types";

export const BOSUR_REVIEW_VERSION = "bosur-repo-audit-2026-10-30-v1";
const REPO = "https://github.com/im-ulises/bosur-operations";
const ACCEPTANCE = REPO + "/blob/codex/m2-evidence-completion/docs/milestones/M1-ACCEPTANCE-STATUS.md";
const EXECUTION = REPO + "/blob/codex/m2-evidence-completion/docs/milestones/M2-STAGING-EXECUTION.md";
const EVIDENCE = REPO + "/blob/codex/m2-evidence-completion/docs/milestones/M2-STAGING-EVIDENCE.md";
const DECISIONS = REPO + "/blob/codex/m2-evidence-completion/docs/DECISIONS.md";

type Evidence = NonNullable<SoftwareMilestone["verification"]>;
const accepted = (summary: string, url: string): Evidence => ({ level: "accepted", summary, url });
const staging = (summary: string, url: string): Evidence => ({ level: "staging", summary, url });
const pending = (summary: string, url: string): Evidence => ({ level: "pending", summary, url });

/** Review only changes the verified exact milestone, never closes the whole roadmap. */
const MILESTONES: Record<string, Evidence> = {
  "bosur-m05-roles": accepted("Mary y Essly definidos para supervisión e higiene/calidad; modelo temporal de permisos M1 registrado.", DECISIONS),
  "bosur-m05-flow": accepted("Temperatura seleccionada como primer workflow y limpieza como segundo.", DECISIONS),
  "bosur-m05-risks": accepted("Decisiones y riesgos documentados. Fletes y responsable de criterios NOM-251 siguen abiertos.", REPO + "/issues/1"),
  "bosur-m05-validation": pending("Pendiente validar operación real de Fletes México y designar responsable de criterios NOM-251.", REPO + "/issues/1"),
  "bosur-m1-access": accepted("Login de operador y lectura de tareas probados en HTTPS staging.", ACCEPTANCE),
  "bosur-m1-reading": accepted("Captura 100 °C TEST/DEMO con usuario, planta, activo y versión preservados.", ACCEPTANCE),
  "bosur-m1-rules": accepted("Evaluación determinística de rango de prueba y excepción trazable comprobadas.", ACCEPTANCE),
  "bosur-m1-alert": accepted("Excepción visible con autorización de supervisión y aislamiento entre plantas.", ACCEPTANCE),
  "bosur-m1-corrective": accepted("Mary registró correctiva en el escenario completo de staging.", ACCEPTANCE),
  "bosur-m1-review": accepted("Essly verificó y cerró la excepción; M1 fue aceptado por D-011.", ACCEPTANCE),
  "bosur-m1-audit": accepted("Historia de seis eventos persistente tras recarga en staging.", ACCEPTANCE),
  "bosur-m1-tablet": pending("La demo HTTPS se aceptó con excepción D-011; falta probar una tablet física antes del piloto (#11).", REPO + "/issues/11"),
  "bosur-m2-templates": staging("Plantillas versionadas importadas y probadas en staging; configuración de limpieza.", EXECUTION),
  "bosur-m2-fields": pending("Campos configurables y señales booleanas implementadas, pero reglas generales/compliance pendientes.", REPO + "/blob/codex/m2-evidence-completion/docs/M2-FORM-ATTENTION.md"),
  "bosur-m2-schedule": staging("Tareas de limpieza programadas diariamente e idempotencia verificadas en Railway.", EXECUTION),
  "bosur-m2-submissions": pending("Captura/revisión configurable comprobada; falta foto original, recuperación y lectura privada en staging (#28).", EVIDENCE),
  "bosur-m2-approval": pending("Revisión genérica existe; acciones correctivas y aprobación configurables completas siguen pendientes.", EXECUTION),
  "bosur-m2-events": staging("Captura y revisión de limpieza preservan actor, versión, audit events y contexto.", EXECUTION),
  "bosur-m2-cleaning": staging("Demo de MESAS en La Nogalera y revisión separada en staging; no acepta todo M2.", EXECUTION),
  "bosur-m3-cleaning": pending("Limpieza en modo TEST/DEMO; no hay evidencia de operación diaria validada en ambas plantas.", EVIDENCE),
  "bosur-m3-reception": pending("Recepción REV 1.2 implementada como demo específica, no operación integral M3.", REPO + "/blob/main/docs/FOOD-RECEPTION-DEMO.md"),
  "bosur-m4-incident": pending("Existe ciclo de excepción de temperatura M1, pero falta módulo general de incidentes M4.", ACCEPTANCE),
  "bosur-m9-retries": pending("Hay idempotencia de M1/M2, pero faltan pruebas de resiliencia integral de producción y tablet real.", REPO + "/issues/11"),
};

const REVIEW: NonNullable<SoftwareProject["repositoryReview"]> = {
  version: BOSUR_REVIEW_VERSION,
  reviewedAt: "2026-10-30",
  repositoryBranch: "codex/m2-evidence-completion",
  repositoryCommit: "0576ace6699d0ea93237aab6e23ccb0166a189a4",
  stagingUrl: "https://staging.bosur.app",
  apiDeployment: "77bbb2f0-2154-47af-981d-50733fcaafe8",
  webDeployment: "c0799f09-1243-44e9-9c48-da7f8dfe3327",
  summary: "M1 aceptado funcionalmente (D-011, 16/oct), tablet física pendiente. M2 en ingeniería y staging con partes verificadas, sin aceptación integral: prueba de fotografías bloqueada por accesos.",
  blockers: [
    "M2 #28: operator.test y Mary respondieron 401; recuperar acceso autorizado y validar foto, revisión privada, hash y aislamiento.",
    "M1 #11: probar tablet física, tacto/teclado/orientación, sesión compartida, conectividad y reintentos antes del piloto.",
    "M0.5 #1: validar contexto real de Fletes México y designar responsable de criterios concretos NOM-251.",
    "PR #22 abierto, mejoras M1/M2 no fusionadas a main: staging está desplegado desde codex/m2-evidence-completion.",
  ],
  findings: [
    "M1: tarea, temperatura, regla demo, excepción, correctiva Mary, verificación/cierre Essly y seis eventos auditados (D-011).",
    "M2: templates versionados, campos configurables, captura/revisión, schedules y tareas recurrentes con idempotencia demostrados.",
    "Railway 30/oct: API y Web SUCCESS; Postgres 18 + almacenamiento privado; migraciones 0013/0014 y provisión MESAS/SILLAS.",
    "M3: recepción y limpieza tienen demostraciones parciales; no equivalen a operación completa validada en plantas.",
  ],
};

const AUDIT_NOTE = "\n\nREVISIÓN DE REPOSITORIO · 2026-10-30\n" + REVIEW.summary
  + "\nPendientes: " + REVIEW.blockers.join(" | ");
const STACK = "Next.js / React · FastAPI / Python · SQLAlchemy / Alembic · PostgreSQL 18 · Railway staging · S3 privado · PWA tablet-first";
const OLD_STACK = "Backend central · PostgreSQL · tablet-first · almacenamiento de evidencias · audit events";
const OLD_NEXT = "Confirmar datos mínimos del workflow de temperatura y criterios de excepción; preparar entornos y validar M0.5/M1 con Mary, Essly y operadores.";
const NEXT = "M2 #28: recuperar acceso legítimo de operador y Mary; validar captura de fotos, recuperación tras recarga, revisión, hashes y privacidad en staging. Mantener datos históricos intactos. Antes del piloto: tablet física (#11).";

/** Applies once for an existing BOSUR record, preserving any custom content. */
export function applyBosurRepositoryReview(project: SoftwareProject): SoftwareProject {
  if (project.repositoryReview?.version === BOSUR_REVIEW_VERSION) return project;
  const phases = project.phases.map(phase => ({
    ...phase,
    status: phase.id === "bosur-phase-m1" && phase.status === "pending" ? "done" as const
      : phase.id === "bosur-phase-m2" && phase.status === "pending" ? "active" as const
        : phase.status,
    notes: phase.notes + (
      phase.id === "bosur-phase-m1" && !phase.notes.includes("D-011, 16/oct")
        ? "\nREVISIÓN D-011, 16/oct: M1 aceptado funcionalmente en staging; pendiente tablet física (#11)." :
      phase.id === "bosur-phase-m2" && !phase.notes.includes("REVISIÓN M2 30/oct")
        ? "\nREVISIÓN M2 30/oct: entregas parciales en staging; falta aceptación completa de evidencia privada con operador/Mary (#28)." : ""),
    milestones: phase.milestones.map(milestone => {
      const verification = MILESTONES[milestone.id];
      if (!verification) return milestone;
      return {
        ...milestone,
        done: milestone.done || verification.level === "accepted" || verification.level === "staging",
        verification,
      };
    }),
  }));
  return {
    ...project,
    repoUrl: project.repoUrl || REPO,
    stack: !project.stack || project.stack === OLD_STACK ? STACK : project.stack,
    status: project.status === "planning" ? "building" : project.status,
    nextAction: !project.nextAction || project.nextAction === OLD_NEXT ? NEXT : project.nextAction,
    notes: project.notes.includes("REVISIÓN DE REPOSITORIO · 2026-10-30")
      ? project.notes : project.notes + AUDIT_NOTE,
    repositoryReview: REVIEW,
    phases,
  };
}
