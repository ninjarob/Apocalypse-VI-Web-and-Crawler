# GitHub Copilot Instructions for Apocalypse VI MUD

## Project-Wide Development Guidelines

### 🔴 CRITICAL: Documentation Requirements
**MANDATORY**: After completing each request, IMMEDIATELY update the `docs/development/DEVELOPMENT_STATUS.md` file to reflect:
- Changes made
- Features added
- Issues resolved

This is **non-negotiable** for every completed task.

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
- `backend/seed.ts` - Database initialization
- `crawler/src/tasks/` - Task-based MUD automation

### 🎯 Best Practices
- Always verify builds after changes
- Use modular architecture (separate concerns)
- Follow existing patterns in codebase
- Test endpoints before marking complete
