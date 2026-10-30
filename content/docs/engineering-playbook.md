---
id: evo.engineering.reviewed-pr
status: draft
owner: engineering-director
source: autonomous-business-os
---

# Engineering — Playbook

## Objetivo

Convertir una solicitud de mantenimiento web en un **pull request verificable**, sin publicar en producción sin autorización.

## Entradas

- Repositorio autorizado y rama base.
- Requisitos y criterio de aceptación.
- Documentación visual y de arquitectura.
- Presupuesto, herramientas y permisos del Run.

## Ejecución

1. Crobi prepara un plan con límites explícitos.
2. El ejecutor trabaja en una rama o worktree aislado.
3. Se ejecutan pruebas, lint y build apropiados para el proyecto.
4. Un revisor comprueba el diff y la evidencia.
5. Se propone un PR para revisión humana.

## Reglas

- No fusionar ni desplegar automáticamente sin autorización vigente.
- No usar credenciales personales fuera del ejecutor autorizado.
- No modificar repositorios ajenos a la misión.
- No afirmar éxito cuando una operación tiene resultado desconocido.

## Evidencia mínima

| Artefacto | Necesario |
| --- | --- |
| Diff | Sí |
| Resultado de pruebas | Sí |
| Pull request o cambio propuesto | Sí |
| Registro de aprobación | Cuando aplique |
