# Manual Test Scripts

This directory contains manual testing scripts for verifying various aspects of the backend system.

## Available Scripts

### Database Verification

- **`check-db.js`** - Verifies class proficiency data and prerequisites
  ```bash
  node tests/manual/check-db.js
  ```

- **`query-races.js`** - Quick query tool to list all races in the database
  ```bash
  node tests/manual/query-races.js
  ```

### API Testing

- **`test-generic-api.js`** - Tests the generic CRUD API system
  - Creates, reads, updates, and deletes test entities (races, classes, skills)
  - Verifies JSON field serialization
  - Tests ID generation
  ```bash
  # Start backend server first, then:
  node tests/manual/test-generic-api.js
  ```

- **`test-validation.js`** - Tests input validation layer
  - Tests valid and invalid entity creation
  - Verifies validation error messages
  - Tests field length limits, enum values, and data types
  ```bash
  # Start backend server first, then:
  node tests/manual/test-validation.js
  ```

- **`test-error-handling.js`** - Tests error handling system
  - 404 Not Found errors
  - 400 Bad Request errors
  - Custom error responses
  - Validation error details
  ```bash
  # Start backend server first, then:
  node tests/manual/test-error-handling.js
  ```

- **`test-items.js`** - Tests item system and metadata
  - Verifies item types, materials, and wear locations
  - Tests item stat effects and flags
  - Checks detailed metadata relationships
  ```bash
  node tests/manual/test-items.js
  ```

## Prerequisites

All API test scripts require:
1. Backend server running (`npm run dev` from backend directory)
2. Database initialized (`npm run seed` if needed)

## Notes

- These scripts are for manual testing and debugging
- They are not part of the automated test suite
- They directly query the database or make HTTP requests to the API
- Use them to verify specific functionality during development
