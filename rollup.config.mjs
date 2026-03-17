import { readFileSync } from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';

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
 * Bundles the Storybook manager entry point into a self-contained ESM file.
 *
 * Private @browserstack/* packages are inlined into the bundle so consumers
 * do not need access to those registries.
 *
 * Only react, react-dom, and storybook/* are kept external — these are
 * always available in a consumer's Storybook environment.
 */
export default {
  input: './manager.js',
  output: {
    file: 'dist/manager.js',
    format: 'esm',
    sourcemap: false,
    inlineDynamicImports: true
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
    // deps (react-icons, @heroicons/react, prop-types, etc.)
    return false;
  },
  plugins: [
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production')
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
    commonjs()
  ]
};
