# SeriesDiff Website documentation

## File structure

```
|- public – non-application files
|- src – source code of application
|    |- assets – assets used in program such as icons, logos etc.
|    |- components – reusable components used on the views
|    |- constants - set of constant react files (e.g. configuration)
|    |- hooks - react hooks, executed on specifical conditions
|    |- pages – whole pages, the user sees
|    |- services – utility services
|    |- utils - files with helper functions to use in services
|    | App.css – main styling file
|    | App.tsx – main file of application
|    | index.tsx – index file
|- tests - E2E tests of frontend
| Dockerfile – Dockerfile to build docker image
| README.md – documentation
| package.json – information about used packages
| playwright.config.ts - setup of E2E tests
| tsconfig.json – configuration file for React
```
## Running Application

### Web Browser Access
Website can be acccessed at [seriesdiff.com](https://www.seriesdiff.com/).

### Local development
If you want to develop the application on your local machine you can use one of the following methods. Ensure you are inside the client directory.
1. If you want to run only the frontend on the local environment using Node.js (requires node and npm installed) you should install all dependencies by `npm install` command and then run development server typing `npm start`
2. If you want to run a docker container to run the application you can do it by two ways:
   - Build and run the client container standalone:
     ```
     docker build -t react-app .
     docker run -it --rm --name react-app -p 3000:3000 react-app
     ```
   - Use docker compose to run the whole application 
     ```
     # to run docker compose you have to be in root project directory
     cd .. 
     docker compose up --build
     ```

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

## Additional informations

If you want to see more details about specifical sites you should visit [help page](https://www.seriesdiff.com/help/getting-started).
## Authors 
- Michał Bojara
- Mikołaj Szulc
- Franciszka Jędraszak
- Karol Kowalczyk
- Natalia Szymczak
