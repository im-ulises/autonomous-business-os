# Departamentos como contexto operativo para Crobi

Estado: frontend local y exportación de contexto, **sin integración ni concesión de permisos a Crobi**.

## Modelo

Un agente genérico reutilizable no pertenece a una empresa ni hereda por defecto sus
reglas. Su ejecución debería recibir un contexto explícito, versionado y autorizado:

1. Identidad, capacidad y charter del agente: definidos y gobernados por **Crobi**.
2. Contexto de empresa/departamento: definido en **Autonomous Business OS**.
3. Proyecto/misión concreta: carga de trabajo, entradas y resultado solicitado.
4. Grants reales: resueltos por Crobi para el workspace, agente y ejecución.

Se permite un mismo agente para varios departamentos, pero la resolución siempre
se hace por `company_id` y `department_id`. Compartir el mismo rol genérico
jamás permite cruzar información entre empresas.

## Archivos exportados

- `<empresa>-<departamento>-context.yaml`: schema
  `autonomous.department-context.v1`, identidad y fecha/revisión, rol solicitado,
  misión, objetivos, KPIs, proceso, tono, límites, escalamiento, inputs/outputs y
  solo identidad de marca **aprobada** de esa empresa.
- `<empresa>-<departamento>-knowledge.md`: experiencias aceptadas **manualmente**,
  con situación, resultado, aprendizaje, fecha, revisor declarado y URL de respaldo.
  Las entradas sin revisión o fuente HTTPS no se incluyen.
- `<empresa>-<departamento>-review.json`: revisión con borradores y entradas
  rechazadas; **no** se debe cargar al runtime como conocimiento aprobado.

Los KPI incluyen meta y fuente, pero `observed_value=null`: esta UI no está
conectada a los indicadores, por lo tanto no inventa resultados ni atribuye éxitos.

## Ciclo de aprendizaje propuesto

`captura → borrador → revisión humana con evidencia → aprobado/rechazado →
exportación → recuperación contextual permitida → observación nueva`.

Editar una experiencia vuelve a convertirla en borrador. La aprobación actual es
un **dato declarado localmente**, no una firma verificada ni un evento auditable.
No hay consolidación automática de ideas del LLM en procedimientos aprobados.

## Compatibilidad Crobi investigada

- En `im-ulises/crobi-chief`, `memory_spaces.py` establece que los Spaces
  delimitan autoridad y tags (no implementados) organizan conocimiento.
- `MemoryAssignment` y los grants efectivos en el manifiesto de una ejecución
  controlan el acceso real. Nunca se crean grants a partir del texto de un paquete.
- `agents/performance_marketing_lead/agent.yaml` define un paquete genérico;
  sus `requires.memory` son solicitudes, **no** permisos.
- `interaction/context_planner.py` aplica recuperación de memoria acotada y
  respeta los permisos de lectura; no hace falta cargar toda la memoria en cada prompt.

Por eso **no** se envían automáticamente los archivos del departamento al agente
ni se escriben como nuevos Spaces en Crobi. Antes de conectarlos hace falta un
contrato revisado de identidad de workspace/departamento, ingestión, origen,
proveniencia, permisos de lectura y publicación de revisiones.

## Siguiente integración, fuera de este PR

1. Persistencia de departamentos y revisiones en backend multi-tenant, con auditoría
   de identidad humana y permisos para aprobar aprendizajes.
2. Endpoint versionado de lectura contextual con autorización (compañía,
   departamento, agente, misión, snapshot/hash y límites de presupuesto de tokens).
3. Ingestión selectiva de aprendizajes en Crobi Memory con proveniencia,
   `origin` y separación entre datos e instrucciones.
4. Grants controlados en Crobi para agentes autorizados; permisos explícitos por
   workspace/Space, nunca deducidos del nombre Marketing ni del YAML.
5. Evaluaciones de aislamiento entre empresas, inyección de prompts, denegaciones,
   versión obsoleta y recuperación de conocimiento útil antes del rollout.

## Límites presentes

Datos alojados en `localStorage` de este navegador, sin servidor compartido,
sin colaboración multiusuario ni control de acceso. No usar para secretos,
contraseñas o información confidencial en el prototipo público.
