# Test Projects

This directory contains standalone test applications for each framework adapter to ensure proper integration and functionality.

## Purpose

These test projects serve to:
1. Verify adapters work in real-world scenarios
2. Test local development workflow with `npm link`
3. Validate package exports and TypeScript definitions
4. Provide debugging environments
5. Demonstrate best practices for users

## Structure

```
test-projects/
├── vanilla-js/          # Pure JavaScript implementation
├── react-app/           # Create React App project
├── vue-app/             # Vue 3 + Vite project
├── angular-app/         # Angular CLI project
├── svelte-app/          # Svelte + Vite project
└── README.md           # This file
```

## Setup Instructions

### Prerequisites
```bash
# Build all packages first
cd /home/navidrezadoost/Documents/Github/cyber-sheet-excel
npm install
npm run build
```

### Create Test Projects

#### 1. Vanilla JS
```bash
cd test-projects/vanilla-js
npm install
npm run dev
```

#### 2. React
```bash
cd test-projects/react-app
npm install
npm link ../../../packages/core ../../../packages/renderer-canvas ../../../packages/react
npm start
```

#### 3. Vue
```bash
cd test-projects/vue-app
npm install
npm link ../../../packages/core ../../../packages/renderer-canvas ../../../packages/vue
npm run dev
```

#### 4. Angular
```bash
cd test-projects/angular-app
npm install
npm link ../../../packages/core ../../../packages/renderer-canvas ../../../packages/angular
npm start
```

#### 5. Svelte
```bash
cd test-projects/svelte-app
npm install
npm link ../../../packages/core ../../../packages/renderer-canvas ../../../packages/svelte
npm run dev
```

## Testing Checklist

For each framework, verify:

- [ ] Package imports work correctly
- [ ] TypeScript types are recognized
- [ ] Component renders without errors
- [ ] Data updates reflect in UI
- [ ] Events are properly emitted
- [ ] Memory cleanup on unmount
- [ ] Hot reload works in dev mode
- [ ] Production build succeeds
- [ ] Bundle size is reasonable

## Common Issues

### Module Resolution Errors
If you see "Cannot find module @cyber-sheet/*":
1. Ensure packages are built: `npm run build` in monorepo root
2. Verify npm link succeeded
3. Check node_modules for symlinks

### TypeScript Errors
If types are not recognized:
1. Ensure `dist/index.d.ts` exists in linked packages
2. Restart TypeScript server in your IDE
3. Check tsconfig.json includes node_modules

### Build Failures
1. Clear node_modules and reinstall
2. Clear package manager cache
3. Rebuild all packages

## Scripts

```bash
# Create all test projects
npm run create-test-projects

# Install all test dependencies
npm run install-test-deps

# Link all packages
npm run link-test-packages

# Run all test projects
npm run test-all-frameworks

# Clean all test projects
npm run clean-test-projects
```

## Notes

- Test projects are **not** included in the monorepo workspace
- They simulate real user installation scenarios
- Use for manual testing and debugging
- DO NOT commit node_modules or build artifacts
