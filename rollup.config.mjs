import { readFileSync } from 'fs';
import { resolve as pathResolve } from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';

/**
 * Dedup plugin: resolves the @browserstack/review-viewer barrel import
 * to source (index.js) instead of dist, matching the Percy frontend's
 * Vite alias strategy.  This ensures ReviewViewerProvider and ReviewSection
 * (which imports from modules/) share the same createContext() instances.
 * Without this, dist/ and modules/ each call createContext() independently,
 * so Provider/Consumer see different React context objects → null.
 */
function dedupeReviewViewer() {
  const rvBase = pathResolve('node_modules/@browserstack/review-viewer');
  return {
    name: 'dedup-review-viewer',
    resolveId(source) {
      if (source === '@browserstack/review-viewer') {
        return pathResolve(rvBase, 'index.js');
      }
      return null;
    }
  };
}

/**
 * Stub plugin: provides empty modules for monorepo-internal imports
 * from @browserstack/review-viewer that don't exist outside the
 * BrowserStack frontend monorepo (e.g. common/constants, common/utils).
 */
function stubMonorepoImports() {
  const stubs = {
    'common/constants/localStorageKeys': 'export const AI_BANNER_DATA_KEY = "ai_banner_data";',
    'common/utils/localPreference': [
      'export function getLocalPreference(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }',
      'export function setLocalPreference(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }',
      'export function removeLocalPreference(key) { try { localStorage.removeItem(key); } catch {} }'
    ].join('\n')
  };
  return {
    name: 'stub-monorepo-imports',
    resolveId(source) {
      if (stubs[source]) return source;
      return null;
    },
    load(id) {
      if (stubs[id]) return stubs[id];
      return null;
    }
  };
}

/**
 * Inline plugin: transforms .svg files into React components so that
 * icon packages (e.g. @browserstack/design-stack-icons) can be bundled
 * without a separate SVG loader.
 */
function svgPlugin() {
  return {
    name: 'svg-react',
    transform(code, id) {
      if (!id.endsWith('.svg')) return null;
      const escaped = JSON.stringify(code.trim());
      return {
        code: `
import * as React from 'react';
const SvgComponent = (props) =>
  React.createElement('span', {
    style: { display: 'inline-flex', lineHeight: 0, ...props.style },
    dangerouslySetInnerHTML: { __html: ${escaped} }
  });
export default SvgComponent;
`,
        map: { mappings: '' }
      };
    }
  };
}

/**
 * Bundles the Storybook manager entry point into ESM with code splitting.
 *
 * Private @browserstack/* packages are inlined into the bundle so consumers
 * do not need access to those registries.
 *
 * The review page (ReviewPage + review-viewer + Redux) is lazy-loaded via
 * React.lazy() and split into a separate chunk to keep initial load fast.
 *
 * Only react, react-dom, and storybook/* are kept external — these are
 * always available in a consumer's Storybook environment.
 */
export default {
  input: './manager.js',
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: false,
    entryFileNames: 'manager.js',
    chunkFileNames: 'chunks/[name]-[hash].js'
  },
  // Externalize everything except private @browserstack/* packages.
  // Public dependencies (react, storybook/*, amplitude, react-router-dom, etc.)
  // are always available in the consumer's environment.
  external: (id) => {
    // Bundle relative imports and absolute paths (our own source files)
    if (id.startsWith('.') || id.startsWith('/')) return false;
    // Externalize what consumers always have in a Storybook environment,
    // plus public dependencies already listed in package.json dependencies.
    const externals = [
      'react',
      'react-dom',
      'react/jsx-runtime',
      // public deps consumers install via package.json
      'react-router-dom',
      'react-router',
      'axios',
      'qs'
    ];
    if (externals.includes(id) || id.startsWith('storybook/')) return true;
    // Bundle everything else — @browserstack/* (private) and their transitive
    // deps (react-icons, @heroicons/react, prop-types, redux, etc.)
    return false;
  },
  plugins: [
    dedupeReviewViewer(),
    stubMonorepoImports(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
      // review-viewer uses Vite env vars that don't exist in Rollup/Storybook context
      'import.meta.env.VITE_BUG_CLASSIFICATION_ENABLED': JSON.stringify('false'),
      'import.meta.env': JSON.stringify({})
    }),
    svgPlugin(),
    // Inject pre-built Tailwind CSS (built by "build:css" script) into the bundle.
    // When the manager.js module loads, it injects a <style> tag into <head>.
    {
      name: 'inject-css',
      transform(code, id) {
        if (!id.endsWith('.scss') && !id.endsWith('.css')) return null;
        // Read the pre-built CSS file instead of the source SCSS
        const css = readFileSync('./dist/manager.css', 'utf8');
        const escaped = JSON.stringify(css);
        return {
          code: `(function(){var s=document.createElement('style');s.textContent=${escaped};document.head.appendChild(s)})();`,
          map: { mappings: '' }
        };
      }
    },
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.jsx'],
      presets: [
        ['@babel/preset-env', { modules: false, targets: { esmodules: true } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
      extensions: ['.js', '.jsx', '.mjs']
    }),
    commonjs(),
    terser()
  ]
};
