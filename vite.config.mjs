import { readFileSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
 * SVG plugin: intercepts .svg imports before Vite's asset pipeline.
 *
 * - review-viewer/assets (browser icons): exported as data-URI strings
 *   for use in <img src={icon}>.
 * - design-stack-icons: exported as inline React components.
 */
function svgPlugin() {
  return {
    name: 'svg-react',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('.svg')) return null;

      const svg = readFileSync(id, 'utf8').trim();

      // review-viewer browser icons: export as data-URI for <img src={...}>
      if (id.includes('review-viewer') && id.includes('assets')) {
        const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        return `export default ${JSON.stringify(dataUri)};`;
      }

      // design-stack-icons: export as inline React component
      const escaped = JSON.stringify(svg);
      return `
import * as React from 'react';
const SvgComponent = (props) =>
  React.createElement('span', {
    style: { display: 'inline-flex', lineHeight: 0, ...props.style },
    dangerouslySetInnerHTML: { __html: ${escaped} }
  });
export default SvgComponent;
`;
    }
  };
}

/**
 * Injects the pre-built Tailwind CSS into the bundle as a <style> tag.
 * The CSS is built by the "build:css" script before Vite runs.
 */
function injectCssPlugin() {
  const VIRTUAL_CSS = '\0inject-css-virtual';
  return {
    name: 'inject-css',
    enforce: 'pre',
    resolveId(source) {
      // Intercept any .scss/.css import from our source (not node_modules)
      // and redirect to a virtual JS module so Vite never sees it as CSS.
      if ((source.endsWith('.scss') || source.endsWith('.css')) &&
          !source.includes('node_modules') &&
          source.includes('manager')) {
        return VIRTUAL_CSS;
      }
      return null;
    },
    load(id) {
      if (id !== VIRTUAL_CSS) return null;
      const css = readFileSync('./dist/manager.css', 'utf8');
      const escaped = JSON.stringify(css);
      return `(function(){var s=document.createElement('style');s.textContent=${escaped};document.head.appendChild(s)})();`;
    }
  };
}

export default defineConfig({
  plugins: [
    stubMonorepoImports(),
    svgPlugin(),
    injectCssPlugin(),
    react({
      jsxRuntime: 'automatic',
      // Many source files (ours + review-viewer) use JSX in .js files
      include: ['**/*.jsx', '**/*.js']
    })
  ],

  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.VITE_BUG_CLASSIFICATION_ENABLED': JSON.stringify('false')
  },

  resolve: {
    // Ensure all deps resolve to a single copy — prevents duplicate contexts
    dedupe: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
    extensions: ['.js', '.jsx', '.mjs']
  },

  build: {
    lib: {
      entry: './manager.jsx',
      formats: ['es'],
      fileName: () => 'manager.js'
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    minify: 'terser',

    rollupOptions: {
      external: (id) => {
        // Bundle relative imports and absolute paths (our source files)
        if (id.startsWith('.') || id.startsWith('/')) return false;
        // Externalize what consumers always have in a Storybook environment
        const externals = [
          'react',
          'react-dom',
          'react/jsx-runtime',
          'react-router-dom',
          'react-router',
          'axios',
          'qs'
        ];
        if (externals.includes(id) || id.startsWith('storybook/')) return true;
        // Bundle everything else — @browserstack/* (private) and transitive deps
        return false;
      },
      output: {
        entryFileNames: 'manager.js',
        chunkFileNames: 'chunks/[name]-[hash].js'
      }
    }
  }
});
