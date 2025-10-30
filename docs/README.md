# Documentation Index

This directory contains technical documentation for the Apocalypse VI MUD project.

## Database Documentation

- **[Items Schema](ITEMS_SCHEMA.md)** - Comprehensive documentation of the item system database schema
  - Normalized item data structure
  - Type-specific tables (weapons, armor, consumables, etc.)
  - Reference tables (materials, flags, wear locations)
  - Junction tables for many-to-many relationships

## Architecture Documentation

For general architecture and setup information, see the root-level documentation:

- **[README.md](../README.md)** - Project overview and getting started
- **[SETUP.md](../SETUP.md)** - Detailed setup instructions
- **[QUICK_REFERENCE.md](../QUICK_REFERENCE.md)** - Quick command reference
- **[DEVELOPMENT_STATUS.md](../DEVELOPMENT_STATUS.md)** - Current development status
- **[FRONTEND_REFACTORING.md](../FRONTEND_REFACTORING.md)** - Frontend refactoring notes

## Backend Documentation

- **[Database Management](../backend/DATABASE.md)** - Database seeding, management, and schema overview
- **[Test Scripts](../backend/tests/manual/README.md)** - Manual testing scripts documentation

## Key Concepts

### Shared Configuration

- **`shared/types.ts`** - TypeScript type definitions shared between frontend and backend
- **`shared/entity-config.ts`** - Entity configuration used by generic API and frontend

### Generic CRUD System

The project uses a configuration-driven approach:

1. Entity types defined in `shared/entity-config.ts`
2. Backend provides generic CRUD endpoints: `/api/{entity-type}`
3. Frontend uses generic components to display entities
4. Validation schemas in `backend/src/validation/schemas.ts`

### Database Schema

- **SQLite Database:** `data/mud-data.db`
- **Seed Script:** `backend/seed.ts` (defines all tables and seed data)
- **Migrations:** Drop and recreate tables (run `npm run db:reset`)

### API Architecture

```
Frontend (React + Vite)
    ↓ HTTP
Backend (Express + TypeScript)
    ↓ Service Layer
Repository Layer
    ↓ SQL
SQLite Database
```

## Contributing

When adding new features:

1. Update type definitions in `shared/types.ts`
2. Add entity config in `shared/entity-config.ts`
3. Add validation schema in `backend/src/validation/schemas.ts`
4. Add table definition in `backend/seed.ts`
5. Create specialized service/repository if needed (otherwise generic system handles it)
6. Update this documentation as appropriate
