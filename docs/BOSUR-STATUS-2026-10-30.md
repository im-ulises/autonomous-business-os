# BOSUR Operations — conciliación de avance (30/oct/2026)

## Fuentes verificadas
- Plan contractual: PDF cliente **BOSUR — Plan de Trabajo v1 · Implementación**, septiembre de 2026, 9 páginas.
- Repositorio privado: https://github.com/im-ulises/bosur-operations
- Rama de staging/revisión: `codex/m2-evidence-completion`, SHA `0576ace6699d0ea93237aab6e23ccb0166a189a4`.
- `main` observado: `6397e599bb83d1ae7cae3cfa473efabdc36538a2` (30/sep; aún no integra las ramas M2).
- Railway `bosur-operations-staging`: API `77bbb2f0-2154-47af-981d-50733fcaafe8`, Web `c0799f09-1243-44e9-9c48-da7f8dfe3327`, ambos SUCCESS (30/oct); PostgreSQL 18 y bucket privado activos, sin cambios staged.

## Estado por milestone contractual

| Milestone | Estado registrado | Evidencia y matiz |
| --- | --- | --- |
| M0.5 Freeze | Pendiente / subhitos parciales | Roles, flujo de temperatura y riesgos documentados; issue #1 abierta por Fletes y responsable NOM-251. |
| M1 BOSUR Alive | **Aceptado funcionalmente** | D-011 autoriza cierre por demo HTTPS (16/oct): operador → temperatura de prueba → excepción → correctiva Mary → cierre Essly → 6 eventos. **Deuda tablet real #11** antes de piloto. |
| M2 Process Engine | **En curso; no aceptado** | Configuraciones versionadas, schedule recurrente, demo MESAS y auditoría comprobadas; evidencia privada instalada pero pruebas de foto en staging bloqueadas por accesos operator.test/Mary (#28). |
| M3 Critical Operations | Pendiente, desarrollo parcial | Recepción REV 1.2 especializada y limpieza TEST/DEMO; faltan operación diaria y validación de cuatro workflows en ambas plantas. |
| M4 Incidents & Compliance | Pendiente | Excepción M1 no equivale a módulo amplio ni a reglas NOM-251 validadas. |
| M5 Audit Ready | Pendiente | Audit logs de M1 no equivalen a preparación y expediente por planta/periodo. |
| M6 Recetas & Planeación | Pendiente | Sin evidencia verificable de módulo; va antes de IoT. |
| M7 IoT | Pendiente | Interfaces/entidades previstas, sin pruebas físicas. |
| M8 Pilot | Pendiente | Requiere operación formal en La Nogalera y Fletes México. |
| M9 Production | Pendiente | Staging no equivale a producción; restauración, conectividad y capacitación completas no verificadas. |

## Marcas aplicadas en Business OS

- M0.5: 3 subhitos documentales marcados, falta validación operativa.
- M1: 7 subhitos de software/flujo aceptados. El subhito **tablet física** sigue sin marcar. La fase sí figura **Aceptada** según D-011, que registra esa excepción explícita.
- M2: 4 subhitos probados en staging marcados (templates, programación, auditoría, demo acotada de limpieza). El resto queda pendiente, con enlaces de evidencia.
- M3–M9: ningún cierre de fase; algunas tareas muestran notas de avance parcial sin marcarse como terminadas.
- Estos estados fueron conciliados una sola vez con los datos locales; las próximas modificaciones manuales del usuario no se sobreescriben al volver a cargar.

## Evidencia primaria y pendientes
- [D-011 y decisiones](https://github.com/im-ulises/bosur-operations/blob/codex/m2-evidence-completion/docs/DECISIONS.md)
- [Aceptación M1](https://github.com/im-ulises/bosur-operations/blob/codex/m2-evidence-completion/docs/milestones/M1-ACCEPTANCE-STATUS.md)
- [M2 ejecución programada y demo de limpieza](https://github.com/im-ulises/bosur-operations/blob/codex/m2-evidence-completion/docs/milestones/M2-STAGING-EXECUTION.md)
- [M2 foto privada: despliegue y bloqueo vigente](https://github.com/im-ulises/bosur-operations/blob/codex/m2-evidence-completion/docs/milestones/M2-STAGING-EVIDENCE.md)
- [Issue #1: Fletes México y NOM-251](https://github.com/im-ulises/bosur-operations/issues/1)
- [Issue #11: tablet física](https://github.com/im-ulises/bosur-operations/issues/11)
- [Issue #28: evidencia privada](https://github.com/im-ulises/bosur-operations/issues/28)
- [PR #22 abierto](https://github.com/im-ulises/bosur-operations/pull/22)

**Precauciones:** La rama `main` no refleja todo lo desplegado en staging. Los datos de ejemplo no son mediciones ni reglas regulatorias de BOSUR. La observación de credenciales que devolvieron 401 no determina por sí sola la causa; no se realizaron restablecimientos ni acciones sobre la base de datos al efectuar esta conciliación. No se ha verificado directamente el ciclo fotográfico de staging en esta revisión.
