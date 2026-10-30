/**
 * SPINFORGE - Circular Dependency Graph Analysis Test
 * Statically parses all ES module imports across src/ to guarantee no circular dependency cycles exist.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');

function getAllJsFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"](\.[^'"]+)['"]/g;
  const dependencies = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const relativeTarget = match[1];
    const resolvedPath = path.resolve(path.dirname(filePath), relativeTarget);
    dependencies.push(resolvedPath);
  }
  return dependencies;
}

describe('Dependency Graph: Zero Circular Dependencies', () => {
  test('No cycles exist in the src/ import graph', () => {
    const files = getAllJsFiles(SRC_DIR);
    const adjList = new Map();

    for (const file of files) {
      const deps = extractImports(file);
      adjList.set(file, deps);
    }

    // DFS Cycle Detection
    const visited = new Map(); // 0 = unvisited, 1 = visiting (in stack), 2 = visited
    const cycles = [];

    function dfs(node, pathStack) {
      visited.set(node, 1);
      pathStack.push(node);

      const neighbors = adjList.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) || visited.get(neighbor) === 0) {
          dfs(neighbor, pathStack);
        } else if (visited.get(neighbor) === 1) {
          // Cycle found!
          const cycleStartIndex = pathStack.indexOf(neighbor);
          const cyclePath = pathStack.slice(cycleStartIndex).concat(neighbor);
          cycles.push(cyclePath.map((p) => path.relative(SRC_DIR, p)));
        }
      }

      visited.set(node, 2);
      pathStack.pop();
    }

    for (const file of files) {
      if (!visited.has(file) || visited.get(file) === 0) {
        dfs(file, []);
      }
    }

    assert.strictEqual(
      cycles.length,
      0,
      `Found circular dependencies:\n${cycles.map((c) => c.join(' -> ')).join('\n')}`
    );
  });
});

