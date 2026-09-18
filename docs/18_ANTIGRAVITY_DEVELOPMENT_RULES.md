# EcoSetu — Antigravity Development Rules

> These rules govern how the AI coding agent (Antigravity) must behave when implementing this project. Violations result in rejected work.

---

## Rule 1: One Prompt = One Task

- Complete exactly one well-defined task per prompt
- Do not anticipate or pre-build unrequested features
- Do not "while I'm here" add unrelated improvements
- Stop after the task is done and report what was completed

---

## Rule 2: No Autonomous Feature Development

- Only implement features explicitly requested in the prompt
- If the roadmap lists 5 tasks, only complete the ones asked for
- Do not add features because they "seem like a good idea"
- If you think a feature should be added, ask — do not build it

---

## Rule 3: No Unrequested Refactoring

- Do not refactor existing code unless explicitly asked
- Do not rename files, variables, or functions that are working
- Do not reorganize directory structures unless asked
- Do not change coding patterns that are already established

---

## Rule 4: No Architecture Changes Without Approval

- Do not change the technology stack
- Do not add new libraries without explicit request or approval
- Do not change the database schema beyond what is requested
- Do not change API route patterns or response formats
- If a change is needed, explain why and wait for approval

---

## Rule 5: No Technology Stack Changes

- **Client Platform (MVP):** Android Mobile Application (React Native 0.73+ / Android Gradle build producing installable APK)
- **Backend:** Node.js + Express.js + Prisma ORM
- **Database:** PostgreSQL (Neon / local)
- **AI:** Python + FastAPI + Ultralytics YOLOv8
- **Web Application:** Strictly marked as **FUTURE / DEFERRED**; do not implement web frontend unless explicitly instructed
- Do not switch to Flutter, Kotlin/Native, TypeScript, Tailwind, Next.js, MongoDB, Django, or any unapproved stack

---

## Rule 6: No Deleting Files Without Approval

- Never delete source files without explicit instruction
- Never remove test files
- Never remove documentation files
- If a file should be deleted, ask first

---

## Rule 7: No Database Destructive Operations

- Never run `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`
- Never delete migration files
- Never modify existing migration files
- Only create new migrations for schema changes
- Always use `prisma migrate dev --name <descriptive_name>`

---

## Rule 8: No Fake Implementations

- Do not create stub/mock implementations and call them complete
- If a feature requires an external service (AI, file storage), implement the actual integration
- If an external service is unavailable, implement graceful fallback — not a fake
- Clearly mark any prototype/mock behavior (e.g., mock verification = admin clicks approve; this IS the prototype implementation)

---

## Rule 9: No Hardcoded Credentials

- Never hardcode passwords, API keys, secrets, or tokens in source code
- Always use environment variables
- Always reference `.env.example` for new variables
- Never commit `.env` files

---

## Rule 10: No Secret Exposure

- Never log passwords (plain or hashed)
- Never log JWT tokens
- Never include secrets in API responses
- Never include secrets in error messages
- Never include secrets in comments or documentation

---

## Rule 11: Test Only Relevant Changes

- After making changes, run tests related to the modified code
- Do not run the entire test suite unless asked
- If a test fails due to your changes, fix it before completing the task
- If a test fails for unrelated reasons, report it — do not fix it silently

---

## Rule 12: Preserve Existing Functionality

- Before modifying a file, read and understand the existing code
- Ensure your changes do not break existing features
- If your changes might affect other features, test them
- Do not remove comments, docstrings, or documentation that are unrelated to your changes

---

## Rule 13: Inspect Before Modifying

- Before editing any file, read its current contents
- Understand the existing patterns before adding new code
- Match existing code style (indentation, naming, formatting)
- Do not introduce a different coding style in the same file

---

## Rule 14: Stop After Task Completion

- When the requested task is done, stop
- Do not continue with "bonus" work
- Do not start the next phase/task without being asked
- Report what was completed and what was tested

---

## Rule 15: Ask Before Major Ambiguous Decisions

If you encounter any of these, STOP and ask:

- "Should I use library X or library Y?"
- "The schema doesn't specify this field — should I add it?"
- "This API endpoint isn't documented — should I create it?"
- "The design says X but the schema says Y — which is correct?"
- "This requires a significant change to existing code — proceed?"

---

## Required Response Format

After completing each task, respond with:

```
## Completed
- [What was done]

## Files Modified
- [List of files created/modified/deleted]

## Tests
- [Tests run and results]

## Notes
- [Any issues, warnings, or questions]
```

---

## Canonical References

When implementing, always reference these documents:

| Decision | Document |
|----------|----------|
| Terminology, roles, entities | `00_PROJECT_INDEX.md` |
| Feature requirements | `01_PRD.md` |
| System design | `02_SYSTEM_ARCHITECTURE.md` |
| Technology choices | `03_TECH_STACK.md` |
| Database tables, fields, types | `04_DATABASE_SCHEMA.md` |
| API routes, request/response | `05_API_SPECIFICATION.md` |
| Role permissions | `06_ROLES_AND_PERMISSIONS.md` |
| Business rules | `07_BUSINESS_WORKFLOWS.md` |
| UI components, screens | `08_UI_UX_SPECIFICATION.md` |
| Frontend patterns | `09_FRONTEND_ARCHITECTURE.md` |
| Backend patterns | `10_BACKEND_ARCHITECTURE.md` |
| AI system | `11_AI_EWASTE_DETECTION.md` |
| Security | `13_SECURITY_PRIVACY.md` |
| Project structure | `16_PROJECT_STRUCTURE.md` |

If a document doesn't specify something, ask — do not invent.

---

*These rules are non-negotiable.*
