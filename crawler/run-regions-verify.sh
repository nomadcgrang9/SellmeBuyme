#!/bin/bash
# Run crawler for verified regions
echo "🚀 Starting verification for Gwangju, Jeonbuk, Jeju..."

# Gwangju
echo "--------------------------------"
echo "👉 Running Gwangju..."
node crawler/index.js --source=gwangju

# Jeonbuk
echo "--------------------------------"
echo "👉 Running Jeonbuk..."
node crawler/index.js --source=jeonbuk

# Jeju
echo "--------------------------------"
echo "👉 Running Jeju..."
node crawler/index.js --source=jeju

echo "--------------------------------"
echo "✅ Verification Complete."
