#!/bin/bash
#
# validate-metadata.sh
# 
# Wave 0 Day 3: Metadata Completeness Validation Script
# 
# PURPOSE:
# - Runs metadata validation test before commit
# - Ensures all 279 functions have complete StrictFunctionMetadata
# - Fails fast if any metadata is incomplete
# 
# USAGE:
# - Manually: ./scripts/validate-metadata.sh
# - Pre-commit: Add to .git/hooks/pre-commit
# - CI: Add to workflow as quality gate
#

set -e  # Exit on first error

echo "🔍 Wave 0 Day 3: Metadata Validation"
echo "===================================="
echo ""

# Change to project root
cd "$(dirname "$0")/.."

echo "📊 Running metadata completeness validation..."
echo ""

# Run the metadata validation test
cd packages/core
npx jest --config jest.config.cjs metadata-validation.test.ts --silent

# Check exit code
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Metadata validation PASSED"
  echo "   All 279 functions have complete StrictFunctionMetadata"
  echo ""
  exit 0
else
  echo ""
  echo "❌ Metadata validation FAILED"
  echo "   One or more functions have incomplete metadata"
  echo ""
  echo "Fix required fields before committing:"
  echo "  - complexityClass (required)"
  echo "  - precisionClass (required)"
  echo "  - errorStrategy (required)"
  echo "  - volatile (explicit boolean)"
  echo "  - iterationPolicy (explicit IterationPolicy | null)"
  echo "  - needsContext (explicit boolean)"
  echo ""
  exit 1
fi
