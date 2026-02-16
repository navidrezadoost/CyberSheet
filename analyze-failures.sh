#!/bin/bash
echo "=== FAILURE CATEGORIZATION (Post-Addressing Fix) ==="
echo ""

# DateTime
echo "📅 DateTime Functions:"
npm test -- datetime 2>&1 | grep -E "Tests:" | tail -1

# Financial
echo "💰 Financial Functions:"
npm test -- financial 2>&1 | grep -E "Tests:" | tail -1

# Statistical  
echo "📊 Statistical Functions:"
npm test -- statistical 2>&1 | grep -E "Tests:" | tail -1

# Engineering
echo "⚙️  Engineering Functions:"
npm test -- engineering 2>&1 | grep -E "Tests:" | tail -1

# Dynamic Arrays/Text
echo "🔢 Dynamic Arrays & Text:"
npm test -- "unique.test|textsplit" 2>&1 | grep -E "Tests:" | tail -1

# Error Handling
echo "❌ Error Strategy:"
npm test -- error 2>&1 | grep -E "Tests:" | tail -1

# Charts/Renderer
echo "📈 Charts & Renderer:"
npm test -- "renderer-canvas" 2>&1 | grep -E "Tests:" | tail -1

# Excel Parity
echo "🎯 Excel Parity:"
npm test -- "excel-parity|excel-oracle" 2>&1 | grep -E "Tests:" | tail -1

