# Comparison Tool Website documentation

## File structure

```
|- public – non-application files
|- src – source code of application
    |- assets – assets used in program such as icons, logos etc.
    |- components – reusable components used on the views
    |- pages – whole pages, the user sees
    |- services – utility services
    | App.css – main styling file
    | App.tsx – main file of application
    | index.tsx – index file
| Dockerfile – Dockerfile to build docker image
| README.md – documentation
| package.json – information about used packages
| tsconfig.json – configuration file for React
```
# Running Application
To run app type `npm start` in the terminal or start the whole app by typing `docker compose up --build`.

## Testing

### Unit/Integration Tests (Jest)
- Tests for services are located in the `src/services/` folder (e.g., `fetchAllMeans.test.ts` next to `fetchAllMeans.tsx`).
- Run tests: `npm test` (interactive watch mode).
- Run with coverage and auto-open report: Use the script `npm run test:unit` (runs with `--coverage --watchAll=false` and opens `coverage/lcov-report/index.html` in default browser).
  - Coverage is limited to services (`src/services/**/*.{ts,tsx}`) for focused reports.

### E2E/Visual Tests (Playwright)
- Tests are in the `tests/` folder.
- Requires `@playwright/test` in devDependencies – install via `npm install --save-dev @playwright/test` if missing.
- Run tests: `npx playwright test` (Remember to have the app running with `npm start`).
- Run and auto-open report: Use the script `npm run test:e2e` (runs tests and opens HTML report via `npx playwright show-report` in browser).
  - Report in `playwright-report/`.

## Authors 
- Michał Bojara
- Mikołaj Szulc
- Franciszka Jędraszak
- Karol Kowalczyk
- Natalia Szymczak