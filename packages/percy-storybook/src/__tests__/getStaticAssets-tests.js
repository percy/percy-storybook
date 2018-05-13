import { getStorybookJavascriptPaths } from '../getStaticAssets';

it('parses and returns path', () => {
  const html =
    '<html><head></head><body>' +
    '<script src="static/preview.ca96e23c5dfccc147bb6.bundle.js"></script></body></html>';
  expect(getStorybookJavascriptPaths(html)).toEqual([
    'static/preview.ca96e23c5dfccc147bb6.bundle.js',
  ]);
});

it('parses and returns path when single quotes used', () => {
  const html =
    '<html><head></head><body>' +
    "<script src='static/preview.ca96e23c5dfccc147bb6.bundle.js'></script></body></html>";
  expect(getStorybookJavascriptPaths(html)).toEqual([
    'static/preview.ca96e23c5dfccc147bb6.bundle.js',
  ]);
});

it('parses and returns path when type first', () => {
  const html =
    '<html><head></head><body>' +
    '<script type="text/javascript" src="static/preview.ca96e23c5dfccc147bb8.bundle.js"></script>' +
    '</body></html>';
  expect(getStorybookJavascriptPaths(html)).toEqual([
    'static/preview.ca96e23c5dfccc147bb8.bundle.js',
  ]);
});

it('parses and returns path when type last', () => {
  const html =
    '<html><head></head><body>' +
    '<script src="static/preview.ca96e23c5dfccc147bb8.bundle.js" type="text/javascript"></script>' +
    '</body></html>';
  expect(getStorybookJavascriptPaths(html)).toEqual([
    'static/preview.ca96e23c5dfccc147bb8.bundle.js',
  ]);
});

it('parses and returns multiple paths', () => {
  const html =
    '<html><head></head><body>' +
    '<script src="static/other.ca96e23c5dfccc147bb8.bundle.js" type="text/javascript"></script>' +
    '<script src="static/preview.ca96e23c5dfccc147bb8.bundle.js" type="text/javascript"></script>' +
    '</body></html>';
  expect(getStorybookJavascriptPaths(html)).toEqual([
    'static/other.ca96e23c5dfccc147bb8.bundle.js',
    'static/preview.ca96e23c5dfccc147bb8.bundle.js',
  ]);
});

it('excludes paths not in the static folder', () => {
  const html =
    '<html><head></head><body>' +
    '<script src="other/other.ca96e23c5dfccc147bb8.bundle.js" type="text/javascript"></script>' +
    '<script src="static/preview.ca96e23c5dfccc147bb8.bundle.js" type="text/javascript"></script>' +
    '</body></html>';
  expect(getStorybookJavascriptPaths(html)).toEqual([
    'static/preview.ca96e23c5dfccc147bb8.bundle.js',
  ]);
});
