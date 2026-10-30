/**
 * SPINFORGE - Server & Entry Point Integration Test
 * Verifies that the project structure, entry point, stylesheets, and MIME types are properly configured.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

describe('Server & Entry Point Configuration', () => {
  test('index.html exists and links required CSS and main entry point', () => {
    const indexPath = path.join(ROOT_DIR, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'index.html must exist');

    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.match(html, /<canvas id="game-canvas">/, 'Canvas element must be present');
    assert.match(html, /<script type="module" src="\.\/src\/main\.js">/, 'Main ES module entry point must be linked');
    assert.match(html, /styles\/main\.css/, 'styles/main.css must be linked');
    assert.match(html, /styles\/ui\.css/, 'styles/ui.css must be linked');
  });

  test('Entry point src/main.js exists and exports bootstrapApplication', () => {
    const mainPath = path.join(ROOT_DIR, 'src/main.js');
    assert.ok(fs.existsSync(mainPath), 'src/main.js must exist');

    const mainCode = fs.readFileSync(mainPath, 'utf-8');
    assert.match(mainCode, /export function bootstrapApplication/, 'bootstrapApplication function must be exported');
    assert.match(mainCode, /import\s+.*\s+from\s+['"]\.\/engine\/GameEngine\.js['"]/, 'Must import GameEngine');
    assert.match(mainCode, /import\s+.*\s+from\s+['"]\.\/rendering\/CanvasRenderer\.js['"]/, 'Must import CanvasRenderer');
    assert.match(mainCode, /import\s+.*\s+from\s+['"]\.\/input\/InputManager\.js['"]/, 'Must import InputManager');
  });

  test('Stylesheets exist and define required design tokens', () => {
    const mainCssPath = path.join(ROOT_DIR, 'styles/main.css');
    const uiCssPath = path.join(ROOT_DIR, 'styles/ui.css');

    assert.ok(fs.existsSync(mainCssPath), 'styles/main.css must exist');
    assert.ok(fs.existsSync(uiCssPath), 'styles/ui.css must exist');

    const mainCss = fs.readFileSync(mainCssPath, 'utf-8');
    assert.match(mainCss, /--accent-cyan/, 'Main CSS must declare theme tokens');
    assert.match(mainCss, /#game-canvas/, 'Main CSS must style canvas container');
  });

  test('server.js exists and defines correct MIME types for ES modules and assets', () => {
    const serverPath = path.join(ROOT_DIR, 'server.js');
    assert.ok(fs.existsSync(serverPath), 'server.js must exist');

    const serverCode = fs.readFileSync(serverPath, 'utf-8');
    assert.match(serverCode, /'\.js':\s*'text\/javascript;\s*charset=UTF-8'/, 'MIME types must map .js to text/javascript');
    assert.match(serverCode, /http\.createServer/, 'Server must create HTTP listener');
  });
});
