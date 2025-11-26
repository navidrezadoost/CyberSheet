# CI/CD Pipeline Documentation

## Overview
Comprehensive continuous integration pipeline for CyberSheet that runs on every push and pull request.

## Pipeline Jobs

### 1. **Test Suite** (`test`)
Core testing across Node.js versions 18.x and 20.x

**Steps:**
- ✅ Checkout code
- ✅ Setup Node.js
- ✅ Install dependencies
- ✅ TypeScript typecheck
- ✅ Build packages
- ✅ Run unit tests with coverage
- ✅ Upload coverage to Codecov
- ✅ Install Playwright browsers
- ✅ Run E2E tests
- ✅ Upload test reports

**Artifacts:**
- Coverage reports (Codecov)
- Playwright HTML reports (7-day retention)

### 2. **Framework Wrapper Tests** (`framework-wrappers`)
Validates all framework integrations

**Matrix:**
- React wrapper
- Vue wrapper
- Angular wrapper
- Svelte wrapper

**Steps:**
- Build core packages
- Test each wrapper
- Lint each wrapper

### 3. **Performance Regression Guard** (`performance`)
Prevents performance degradation

**Benchmarks:**
| Test | Threshold | Description |
|------|-----------|-------------|
| Populate 5000 cells | 1000ms | Cell creation and data insertion |
| Evaluate 1000 formulas | 500ms | Formula engine performance |
| Retrieve 10000 cells | 200ms | Cell access performance |

**Features:**
- ❌ **Fails CI** if thresholds exceeded
- 💬 Comments results on pull requests
- 📊 Tracks performance over time

### 4. **Security Checks** (`security`)
Automated vulnerability scanning

**Scans:**
- `npm audit` with moderate severity threshold
- Snyk security scan (high severity only)

**Configuration:**
- Requires `SNYK_TOKEN` secret for Snyk integration
- Continues on error to not block builds

### 5. **Build Verification** (`build-check`)
Ensures all packages build successfully

**Verifications:**
- ✅ All packages compile
- ✅ Build artifacts exist
- 📦 Bundle size reporting (informational)

### 6. **Status Check** (`status-check`)
Final aggregated status

**Logic:**
- Depends on all previous jobs
- Fails if any required job fails
- Provides clear success/failure message

## Local Testing

### Run Tests Locally
```bash
# Unit tests
npm test

# E2E tests (requires browser install)
npx playwright install chromium
npx playwright test

# Performance benchmarks
npm run bench

# Security audit
npm run security:audit
```

### Simulate CI Environment
```bash
# Full CI test suite
npm run typecheck && \
npm run build && \
npm test -- --ci --coverage && \
npx playwright test

# Build verification
npm run build
test -f packages/core/dist/index.js && echo "✓ Core built"
test -f packages/renderer-canvas/dist/CanvasRenderer.js && echo "✓ Renderer built"
```

## GitHub Actions Configuration

### Required Secrets
- `SNYK_TOKEN` (optional) - Snyk API token for security scans

### Branch Protection Rules
Recommended settings:
```yaml
Require status checks to pass:
  - Test Suite (Node 18.x)
  - Test Suite (Node 20.x)
  - Framework Wrapper Tests
  - Performance Regression Guard
  - Build Verification
```

## Performance Thresholds

### Current Baselines
```javascript
{
  populate: 1000,  // 1 second for 5000 cells
  formulas: 500,   // 500ms for 1000 formula evaluations
  retrieval: 200   // 200ms for 10000 random reads
}
```

### Adjusting Thresholds
Edit `.github/workflows/ci.yml` → `performance` job → `thresholds` object

## Test Coverage

### Current Coverage Targets
- **Minimum:** 70% statement coverage
- **Goal:** 80% overall coverage
- **Critical paths:** 90%+ coverage

### Viewing Coverage
```bash
# Generate coverage report
npm test -- --coverage

# Open HTML report
open coverage/lcov-report/index.html
```

## CI Performance

### Typical Run Times
| Job | Duration | Notes |
|-----|----------|-------|
| Test Suite | 3-5 min | Includes both Node versions |
| Framework Wrappers | 2-3 min | Parallel execution |
| Performance | 1-2 min | Quick benchmarks |
| Security | 1-2 min | Depends on cache |
| Build Check | 1-2 min | Verifies artifacts |

**Total:** ~5-8 minutes for full pipeline

## Troubleshooting

### Tests Failing Locally but Passing in CI
- Check Node.js version: `node --version`
- Clear caches: `rm -rf node_modules package-lock.json && npm install`
- Check environment differences

### E2E Tests Timing Out
- Increase timeout in `playwright.config.ts`
- Check browser installation: `npx playwright install --with-deps`
- Review network conditions

### Performance Benchmarks Failing
- Run locally: `npm run bench`
- Check for system load
- Adjust thresholds if hardware differs significantly

### Coverage Upload Failing
- Verify Codecov token is set (if required)
- Check Codecov service status
- Review upload logs in Actions

## Future Enhancements

- [ ] Visual regression testing
- [ ] Bundle size limits enforcement
- [ ] Automated dependency updates
- [ ] Release automation
- [ ] Browser compatibility matrix (Chrome, Firefox, Safari, Edge)
- [ ] Performance trend tracking
- [ ] Lighthouse audits for examples
- [ ] Cross-platform testing (Windows, macOS, Linux)

## Monitoring

### Success Metrics
- **Green builds:** Target 95%+ success rate
- **Build time:** Keep under 10 minutes
- **Test stability:** No flaky tests

### Alerts
- Failed builds trigger GitHub notifications
- Security issues flagged immediately
- Performance regressions block merges

## Contributing

When adding new tests:
1. ✅ Add to appropriate package's `__tests__` directory
2. ✅ Ensure CI passes locally first
3. ✅ Update this README if adding new CI jobs
4. ✅ Document any new thresholds or checks

---

**Status:** ✅ CI Pipeline Active
**Last Updated:** November 17, 2025
