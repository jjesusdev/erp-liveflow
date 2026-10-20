# AGENTS.md — ERP

## Proyecto
Sistema ERP. Ingeniero de software trabajando solo, tiempo parcial.

## Estructura
```
erp/
├── AGENTS.md              ← este archivo
├── docs/                  ← briefs, decisiones
├── product/               ← user stories, specs
├── roadmap/               ← planes y sesión log
└── src/                   ← código
```

## Workflow (cuándo usar cada skill)
- Construir feature → `feature-dev` skill
- Diseñar UI → `frontend-design` + `ai-slop`
- Review código → `code-review` (cambios grandes) / `code-reviewer` (cambios pequeños)
- Debuggear → `code-explorer` primero, luego `code-reviewer`
- Entrenar modelo → `huggingface-vision-trainer` + `huggingface-llm-trainer`
- Capturar learnings → `agents-md-revise` al final de sesiones productivas
- Auditar reglas → `agents-md-improver` cuando el proyecto cambie significativamente

## Comandos
```bash
npm install
npm run dev
npm run lint
npm run test
```

## Reglas
- No poner secrets en código — usar variables de entorno
- Código y commits en español
- Tests de integración > unitarios (tiempo parcial)

## Idioma
Código, commits y documentación en español.
