import normalizeSizes from '../normalizeSizes';

it('returns empty list given no sizes', () => {
  const sizes = normalizeSizes([]);

  expect(sizes).toEqual([]);
});

it('returns array of specified widths given flat array of numbers', () => {
  const sizes = normalizeSizes([
    320,
    480,
    768
  ]);

  expect(sizes).toEqual([
        { width: 320 },
        { width: 480 },
        { width: 768 }
  ]);
});

it('returns array of specified widths given flat array of numbers as strings', () => {
  const sizes = normalizeSizes([
    '320',
    '480',
    '768'
  ]);

  expect(sizes).toEqual([
        { width: 320 },
        { width: 480 },
        { width: 768 }
  ]);
});

it('returns array of specified heights and widths given array of `width x height` strings', () => {
  const sizes = normalizeSizes([
    '320x480',
    '480x640',
    '1024x768'
  ]);

  expect(sizes).toEqual([
        { width: 320, height: 480 },
        { width: 480, height: 640 },
        { width: 1024, height: 768 }
  ]);
});

it('returns array of specified height and widths given array of objects', () => {
  const sizes = normalizeSizes([
        { width: 320, height: 480 },
        { width: 480, height: 640 },
        { width: 1024, height: 768 }
  ]);

  expect(sizes).toEqual([
        { width: 320, height: 480 },
        { width: 480, height: 640 },
        { width: 1024, height: 768 }
  ]);
});
