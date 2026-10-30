---
id: business-os.docs.contract
status: proposed
owner: product
source: autonomous-business-os
---

# Docs — Contrato de conocimiento

Los archivos `.md` son el **origen canónico de documentación**. La interfaz presenta una vista legible y los agentes consultan fragmentos autorizados.

## Reglas

- Las carpetas organizan; **no conceden permisos**.
- Las etiquetas mejoran la búsqueda; **no autorizan acceso**.
- Un resultado debe incluir origen, ruta, versión y sección.
- Una actualización de documentación crítica se propone como diff revisable.
- El texto de fuentes externas no puede cambiar permisos ni instrucciones del sistema.

## Arquitectura objetivo

```text
Git / Markdown
   ↓ indexador
Índice de secciones en PostgreSQL
   ↓ consultas autorizadas
Crobi MCP docs.search / docs.read
   ↓ contexto mínimo
Agente con autoridad delimitada
```

## Primera entrega

En este starter, solo hay documentos de ejemplo y carga local de Markdown. El gateway MCP autenticado será una fase posterior.
