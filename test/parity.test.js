import { PercyConfig } from '@percy/cli-command';
import * as CoreConfig from '@percy/core/config';
import { storybookSchema, configSchema } from '../src/config.js';
import { mapStorybookSnapshots, shouldSkipStory, isTestEntry } from '../src/snapshots.js';
import { resolveViewportSize, viewportKey } from '../src/utils.js';

const previewUrl = 'http://localhost:6006/iframe.html';

function story(name, percy = {}, meta = {}, extra = {}) {
  return { name, id: name.toLowerCase().replace(/\W+/g, '-'), type: 'story', ...percy, ...extra, storybookMeta: meta };
}

function map(data, { config = {}, project = {}, invalid = [] } = {}) {
  return mapStorybookSnapshots({ data, project, invalid }, {
    previewUrl, flags: {}, config, globalDocSettings: {}
  });
}

function widthsByName(snapshots) {
  return Object.fromEntries(snapshots.map(s => [s.name, s.widths]));
}

describe('resolveViewportSize', () => {
  it('resolves built-in viewport names when the story has no viewport options', () => {
    expect(resolveViewportSize('mobile1')).toEqual({ width: 320, height: 568 });
    expect(resolveViewportSize({ value: 'tablet', isRotated: false })).toEqual({ width: 834, height: 1112 });
  });

  it('resolves custom pixel values and rotation', () => {
    expect(resolveViewportSize('500-700')).toEqual({ width: 500, height: 700 });
    expect(resolveViewportSize('500px-700px')).toEqual({ width: 500, height: 700 });
    expect(resolveViewportSize({ value: '500-700', isRotated: true })).toEqual({ width: 700, height: 500 });
  });

  it('looks keys up in the story options (SB9+ options and SB8 viewports share a shape)', () => {
    let options = { kiosk: { width: '600px', height: '900px' } };
    expect(resolveViewportSize('kiosk', options)).toEqual({ width: 600, height: 900 });
    expect(resolveViewportSize('kiosk', { kiosk: { styles: { width: '600px', height: '900px' } } }))
      .toEqual({ width: 600, height: 900 });
    expect(resolveViewportSize('mobile1', options)).toBeUndefined();
  });

  it('falls back on non-pixel sizes and missing values', () => {
    let log = { debug: jasmine.createSpy('debug') };
    expect(resolveViewportSize('100pct-100pct', undefined, log)).toBeUndefined();
    expect(resolveViewportSize('wide', { wide: { width: 'calc(100% - 10px)', height: '10px' } }, log)).toBeUndefined();
    expect(resolveViewportSize('nothing', undefined, log)).toBeUndefined();
    expect(log.debug).toHaveBeenCalledTimes(3);
    expect(resolveViewportSize(undefined)).toBeUndefined();
    expect(resolveViewportSize({ value: undefined, isRotated: false })).toBeUndefined();
    expect(viewportKey('')).toBeUndefined();
  });

  it('rounds fractional pixels and accepts numbers', () => {
    expect(resolveViewportSize('x', { x: { width: '320.4px', height: 500 } })).toEqual({ width: 320, height: 500 });
  });
});

describe('Storybook parity mapping', () => {
  beforeEach(() => {
    PercyConfig.addSchema(CoreConfig.schemas);
    PercyConfig.addSchema([storybookSchema, configSchema]);
  });

  describe('story viewport widths (SB1)', () => {
    it('applies the precedence: story percy.widths > story viewport > project widths', () => {
      let snapshots = map([
        story('None'),
        story('Global', {}, { viewport: { global: 'mobile1' } }),
        story('Option', {}, { viewport: { global: 'kiosk', options: { kiosk: { width: '600px', height: '900px' } } } }),
        story('Legacy', {}, { viewport: { defaultViewport: 'mobile2' } }),
        story('Own Widths', { widths: [999] }, { viewport: { global: 'mobile1' } }),
        story('Preview Widths', { widths: [640] }, { viewport: { global: 'mobile1' } }),
        story('Disabled', {}, { viewport: { global: 'mobile1', disabled: true } }),
        story('Opted Out', { storyViewport: false }, { viewport: { global: 'mobile1' } })
      ], { project: { widths: [640] } });

      expect(widthsByName(snapshots)).toEqual({
        None: undefined,
        Global: [320],
        Option: [600],
        Legacy: [414],
        'Own Widths': [999],
        'Preview Widths': [320],
        Disabled: undefined,
        'Opted Out': undefined
      });
      expect(snapshots.find(s => s.name === 'Global').minHeight).toBe(568);
      expect(snapshots.every(s => !('storyViewport' in s))).toBe(true);
    });

    it('keeps an explicit minHeight', () => {
      let [snapshot] = map([story('Global', { minHeight: 100 }, { viewport: { global: 'mobile1' } })]);
      expect(snapshot).toEqual(jasmine.objectContaining({ widths: [320], minHeight: 100 }));
    });

    it('uses a project-level initialGlobals viewport for stories without their own', () => {
      let snapshots = map([
        story('Inherits'),
        story('Own', {}, { viewport: { global: 'tablet' } })
      ], { project: { viewport: { value: 'mobile1', isRotated: false } } });
      expect(widthsByName(snapshots)).toEqual({ Inherits: [320], Own: [834] });
    });

    it('can be turned off in the Percy config', () => {
      let snapshots = map([story('Global', {}, { viewport: { global: 'mobile1' } })], {
        config: { storyViewport: false }
      });
      expect(snapshots[0].widths).toBeUndefined();
    });

    it('gives additional snapshots with their own viewport global their own width', () => {
      let snapshots = map([story('Base', {
        additionalSnapshots: [
          { suffix: ' [mobile]', globals: { viewport: 'mobile1' } },
          { suffix: ' [fixed]', globals: { viewport: 'mobile1' }, widths: [700] },
          { suffix: ' [plain]', args: { a: 'b' } }
        ]
      })]);
      expect(widthsByName(snapshots)).toEqual({
        Base: undefined, 'Base [mobile]': [320], 'Base [fixed]': [700], 'Base [plain]': undefined
      });
    });

    it('lets a story-pinned viewport win over a mode viewport', () => {
      let snapshots = map([story('Pinned', {}, {
        pinnedGlobals: { viewport: 'tablet' }, viewport: { global: 'tablet' }
      })], { config: { modes: [{ name: 'mobile', globals: { viewport: 'mobile1' } }] } });
      expect(widthsByName(snapshots)).toEqual({ Pinned: [834], 'Pinned [mobile]': [834] });
    });
  });

  describe('modes (SB2)', () => {
    const modes = [
      { name: 'dark', globals: { theme: 'dark' } },
      { name: 'mobile', globals: { viewport: 'mobile1' }, suffix: ' (phone)' }
    ];

    it('adds a snapshot per config mode and keeps the base snapshot', () => {
      let snapshots = map([story('A')], { config: { modes } });
      expect(snapshots.map(s => s.name)).toEqual(['A', 'A [dark]', 'A (phone)']);
      expect(snapshots[1].globals).toEqual({ theme: 'dark' });
      expect(snapshots[2].widths).toEqual([320]);
      expect(snapshots[1].url).toContain('&globals=theme:dark');
      expect(snapshots.every(s => !('modes' in s))).toBe(true);
    });

    it('uses the most specific modes list and disables modes with an empty list', () => {
      let snapshots = map([
        story('Story List', { modes: [{ name: 'hc', globals: { contrast: 'high' } }] }),
        story('Disabled', { modes: [] })
      ], { config: { modes } });
      expect(snapshots.map(s => s.name)).toEqual(['Story List', 'Story List [hc]', 'Disabled']);
    });

    it('skips a mode that matches the globals a story already pins', () => {
      let snapshots = map([story('Pinned Dark', { globals: { theme: 'dark' } }, {
        pinnedGlobals: { theme: 'dark' }
      })], { config: { modes } });
      expect(snapshots.map(s => s.name)).toEqual(['Pinned Dark', 'Pinned Dark (phone)']);
    });

    it('replaces the base snapshot with modesReplaceBase', () => {
      let snapshots = map([
        story('A', {}, { pinnedGlobals: { theme: 'dark' } }),
        story('No Modes', { modes: [] })
      ], { config: { modes, modesReplaceBase: true } });
      expect(snapshots.map(s => s.name)).toEqual(['A [dark]', 'A (phone)', 'No Modes']);
    });

    it('merges mode globals over story globals and applies mode args', () => {
      let [, snapshot] = map([story('A', { globals: { locale: 'fr' } })], {
        config: { modes: [{ name: 'dark', globals: { theme: 'dark' }, args: { size: 'lg' } }] }
      });
      expect(snapshot.globals).toEqual({ locale: 'fr', theme: 'dark' });
      expect(snapshot.args).toEqual({ size: 'lg' });
    });

    it('concatenates config and story additional snapshots instead of merging them by index', () => {
      let snapshots = map([story('Own', {
        additionalSnapshots: [{ suffix: ' [own]', args: { label: 'own' } }]
      })], { config: { additionalSnapshots: [{ suffix: ' [dark]', globals: { theme: 'dark' } }] } });

      expect(snapshots.map(s => s.name)).toEqual(['Own', 'Own [dark]', 'Own [own]']);
      expect(snapshots[1].globals).toEqual({ theme: 'dark' });
      expect(snapshots[1].args).toBeUndefined();
      expect(snapshots[2].globals).toBeUndefined();
      expect(snapshots[2].args).toEqual({ label: 'own' });
    });

    it('validates mode definitions', () => {
      expect(PercyConfig.validate({ modes: [{ name: 'dark', globals: { theme: 'dark' } }] }, '/storybook'))
        .toBeUndefined();
      let errors = PercyConfig.validate({ modes: [{ globals: { theme: 'dark' } }] }, '/storybook');
      expect(errors?.[0]?.path).toEqual('modes[0].name');
    });
  });

  describe('selection (SB3)', () => {
    let tagged = [
      story('Gamma', {}, {}, { tags: ['dev', 'team-a', 'visual-smoke'] }),
      story('Delta', {}, {}, { tags: ['dev', 'team-b'] }),
      story('Plain', {}, {}, { tags: ['dev'] })
    ];
    let names = (config, data = tagged) => map(data, { config }).map(s => s.name);

    it('filters by tags', () => {
      expect(names({ tags: { include: ['visual-smoke'] } })).toEqual(['Gamma']);
      expect(names({ tags: { exclude: ['team-a'] } })).toEqual(['Delta', 'Plain']);
      expect(names({ tags: { include: ['team-a', 'team-b'], exclude: ['visual-smoke'] } })).toEqual(['Delta']);
    });

    it('requires both tag and name filters to pass', () => {
      expect(names({ tags: { include: ['dev'] }, include: ['Delta'] })).toEqual(['Delta']);
      expect(() => names({ tags: { exclude: ['team-b'] }, include: ['Delta'] })).toThrowError('No snapshots found');
    });

    it('skips Storybook test entries unless captureTestEntries is set', () => {
      let data = [
        story('Primary', {}, { subtype: 'story' }, { tags: ['dev', 'test'] }),
        story('Shows Label', {}, { subtype: 'test' }, { tags: ['dev', 'test', 'test-fn'] }),
        story('Tagged Only', {}, {}, { tags: ['test-fn'] })
      ];
      expect(names({}, data)).toEqual(['Primary']);
      expect(names({ captureTestEntries: true }, data)).toEqual(['Primary', 'Shows Label', 'Tagged Only']);
    });

    it('honours a story\'s own include/exclude after a global filter', () => {
      let data = [
        story('Button: Primary'),
        story('Button: Own Exclude', { exclude: ['Own Exclude'] }),
        story('Button: Own Include', { include: ['nothing-matches'] }),
        story('Button: Preview Exclude', { exclude: ['Button'] })
      ];
      let project = { exclude: ['Button'] };
      let snapshots = mapStorybookSnapshots({ data, project, invalid: [] }, {
        previewUrl, flags: {}, config: { include: ['Button'] }, globalDocSettings: {}
      });
      expect(snapshots.map(s => s.name)).toEqual(['Button: Primary', 'Button: Preview Exclude']);
    });

    it('applies the story filters alone when there is no global filter', () => {
      expect(shouldSkipStory('A', { include: ['B'] }, {})).toBe(true);
      expect(shouldSkipStory('A', { exclude: ['/^a$/i'] }, {})).toBe(true);
      expect(shouldSkipStory('A', {}, {})).toBe(false);
      expect(shouldSkipStory('A', { skip: true }, { include: ['A'] })).toBe(true);
    });

    it('detects test entries by subtype first, then by the test-fn tag', () => {
      expect(isTestEntry({ tags: ['test-fn'] }, { subtype: 'story' })).toBe(false);
      expect(isTestEntry({ tags: ['test-fn'] }, {})).toBe(true);
      expect(isTestEntry({}, { subtype: 'test' })).toBe(true);
      expect(isTestEntry({}, undefined)).toBe(false);
    });
  });
});

describe('addon tag filters', () => {
  let cwd = process.cwd();
  let dir;

  beforeEach(async () => {
    let [os, path, fs] = await Promise.all([import('os'), import('path'), import('fs')]);
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'percy-sb-tags-'));
    process.chdir(dir);
  });

  afterEach(() => process.chdir(cwd));

  it('reads storybook.tags from .percy.yml', async () => {
    let { writeFileSync } = await import('fs');
    let { readStorybookTagFilters } = await import('../src/server/projectConfig.cjs');
    expect(await readStorybookTagFilters()).toBeNull();

    writeFileSync('.percy.yml', 'version: 2\nstorybook:\n  tags:\n    include: [smoke]\n');
    expect(await readStorybookTagFilters()).toEqual({ include: ['smoke'], exclude: [] });
  });
});
