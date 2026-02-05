#!/usr/bin/env bash
# Build script for Render to fix Rollup optional dependencies issue

set -e

echo "Cleaning up package-lock.json and node_modules..."
rm -rf package-lock.json node_modules

echo "Installing dependencies (including dev dependencies)..."
npm install --include=dev

echo "Building application..."
npx vite build
