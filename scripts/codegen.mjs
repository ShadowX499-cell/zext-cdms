#!/usr/bin/env node
/**
 * Fetches the OpenAPI spec from the running NestJS server and generates
 * TypeScript types into packages/types/generated/api.ts
 *
 * Usage: node scripts/codegen.mjs
 * Requires: API server running on http://localhost:3001
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outputDir = join(root, 'packages', 'types', 'generated');
const outputFile = join(outputDir, 'api.ts');

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

console.log('🔄 Fetching OpenAPI spec from http://localhost:3001/api/docs-json ...');

try {
  execSync(
    `npx openapi-typescript http://localhost:3001/api/docs-json --output "${outputFile}"`,
    { stdio: 'inherit', cwd: root },
  );
  console.log('✅ Types generated → packages/types/generated/api.ts');
} catch {
  console.error('❌ Codegen failed. Is the API server running on :3001?');
  process.exit(1);
}
