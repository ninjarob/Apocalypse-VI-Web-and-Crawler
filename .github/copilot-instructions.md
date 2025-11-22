# GitHub Copilot Instructions for Apocalypse VI MUD

## Project-Wide Development Guidelines

### 🔴 CRITICAL: Documentation Requirements
**MANDATORY**: After completing each request, IMMEDIATELY update the `docs/development/DEVELOPMENT_STATUS.md` file to reflect:
- Changes made
- Features added
- Issues resolved

This is **non-negotiable** for every completed task.

### 🤖 AI Context Preservation (NEW)
**MANDATORY**: For AI agents working on complex investigations:

1. **Read AI Context Summary** at top of `DEVELOPMENT_STATUS.md` before starting
2. **Use AI_AGENT_REFERENCE.md** for current objectives and commands
3. **Follow SESSION_HANDOFF_TEMPLATE.md** for session documentation
4. **Update SESSION_HANDOFF.md** with session summary and next steps
5. **Preserve debug logging** - do not remove existing investigation logs

### 💻 Terminal & Command Execution
- **Windows PowerShell**: Use `;` as command separator (not `&&`)
- **Backend Domain**: `http://localhost:3002`
- **New Commands**: Always create a new PowerShell terminal to avoid stopping running servers
- **MUD Testing**: Use npm scripts (`npm run crawl:*`) - direct Node.js snippets fail with module/import issues

### 🏗️ Architecture Notes
- **Backend**: Node.js with TypeScript, Express, SQLite
- **Frontend**: React with TypeScript, Vite
- **Crawler**: Autonomous MUD exploration with AI agent

### 📁 Key Files
- `docs/development/DEVELOPMENT_STATUS.md` - Track all completed work here
- `docs/development/AI_AGENT_REFERENCE.md` - 🤖 AI context and commands
- `docs/development/SESSION_HANDOFF.md` - Session context preservation
- `backend/seed.ts` - Database initialization
- `crawler/src/tasks/` - Task-based MUD automation

### 🎯 Best Practices
- Always verify builds after changes
- Use modular architecture (separate concerns)
- Follow existing patterns in codebase
- Test endpoints before marking complete
