import React, { useState, useMemo } from 'react';
import { SnapshotViewer } from '@browserstack/snapshot-viewer';

// ---------------------------------------------------------------------------
// Raw Percy API response for snapshot 2534506865
// ---------------------------------------------------------------------------
const API_RESPONSE = {
  data: {
    type: 'snapshots',
    id: '2534506865',
    attributes: {
      name: '/index.html',
      'review-state': 'approved',
      'review-state-reason': 'no_diffs',
      'diff-ratio': 0,
      'display-name': 'Missing Page Title'
    },
    relationships: {
      build: { data: { type: 'builds', id: '47773121' } },
      comparisons: {
        data: [
          { type: 'comparisons', id: '4332527055' },
          { type: 'comparisons', id: '4332527057' },
          { type: 'comparisons', id: '4332527060' },
          { type: 'comparisons', id: '4332527061' },
          { type: 'comparisons', id: '4332527064' },
          { type: 'comparisons', id: '4332527066' },
          { type: 'comparisons', id: '4332527068' },
          { type: 'comparisons', id: '4332527069' }
        ]
      },
      browsers: {
        data: [
          { type: 'browsers', id: '63' },
          { type: 'browsers', id: '69' },
          { type: 'browsers', id: '70' },
          { type: 'browsers', id: '71' }
        ]
      }
    }
  },
  included: [
    // --- Comparisons ---
    {
      type: 'comparisons', id: '4332527055',
      attributes: { state: 'finished', width: 375, 'diff-ratio': 0 },
      relationships: {
        'head-screenshot': { data: { type: 'screenshots', id: '4328782596' } },
        'base-screenshot': { data: { type: 'screenshots', id: '4328781319' } },
        'diff-image': { data: null },
        browser: { data: { type: 'browsers', id: '63' } }
      }
    },
    {
      type: 'comparisons', id: '4332527057',
      attributes: { state: 'finished', width: 1280, 'diff-ratio': 0 },
      relationships: {
        'head-screenshot': { data: { type: 'screenshots', id: '4328782787' } },
        'base-screenshot': { data: { type: 'screenshots', id: '4328781584' } },
        'diff-image': { data: null },
        browser: { data: { type: 'browsers', id: '63' } }
      }
    },
    {
      type: 'comparisons', id: '4332527060',
      attributes: { state: 'finished', width: 375, 'diff-ratio': 0 },
      relationships: {
        'head-screenshot': { data: { type: 'screenshots', id: '4328782805' } },
        'base-screenshot': { data: { type: 'screenshots', id: '4328781309' } },
        'diff-image': { data: null },
        browser: { data: { type: 'browsers', id: '69' } }
      }
    },
    {
      type: 'comparisons', id: '4332527061',
      attributes: { state: 'finished', width: 1280, 'diff-ratio': 0 },
      relationships: {
        'head-screenshot': { data: { type: 'screenshots', id: '4328782655' } },
        'base-screenshot': { data: { type: 'screenshots', id: '4328781347' } },
        'diff-image': { data: null },
        browser: { data: { type: 'browsers', id: '69' } }
      }
    },
    {
      type: 'comparisons', id: '4332527064',
      attributes: { state: 'finished', width: 375, 'diff-ratio': 0 },
      relationships: {
        'head-screenshot': { data: { type: 'screenshots', id: '4328782643' } },
        'base-screenshot': { data: { type: 'screenshots', id: '4328781617' } },
        'diff-image': { data: null },
        browser: { data: { type: 'browsers', id: '70' } }
      }
    },
    {
      type: 'comparisons', id: '4332527066',
      attributes: { state: 'finished', width: 1280, 'diff-ratio': 0 },
      relationships: {
        'head-screenshot': { data: { type: 'screenshots', id: '4328782623' } },
        'base-screenshot': { data: { type: 'screenshots', id: '4328781434' } },
        'diff-image': { data: null },
        browser: { data: { type: 'browsers', id: '70' } }
      }
    },
    {
      type: 'comparisons', id: '4332527068',
      attributes: { state: 'finished', width: 375, 'diff-ratio': 0 },
      relationships: {
        'head-screenshot': { data: { type: 'screenshots', id: '4328782684' } },
        'base-screenshot': { data: { type: 'screenshots', id: '4328781720' } },
        'diff-image': { data: null },
        browser: { data: { type: 'browsers', id: '71' } }
      }
    },
    {
      type: 'comparisons', id: '4332527069',
      attributes: { state: 'finished', width: 1280, 'diff-ratio': 0 },
      relationships: {
        'head-screenshot': { data: { type: 'screenshots', id: '4328782669' } },
        'base-screenshot': { data: { type: 'screenshots', id: '4328781399' } },
        'diff-image': { data: null },
        browser: { data: { type: 'browsers', id: '71' } }
      }
    },
    // --- Screenshots ---
    {
      type: 'screenshots', id: '4328782596',
      relationships: { image: { data: { type: 'images', id: '226803255' } } }
    },
    {
      type: 'screenshots', id: '4328781319',
      relationships: { image: { data: { type: 'images', id: '226803255' } } }
    },
    {
      type: 'screenshots', id: '4328782787',
      relationships: { image: { data: { type: 'images', id: '226737070' } } }
    },
    {
      type: 'screenshots', id: '4328781584',
      relationships: { image: { data: { type: 'images', id: '226737070' } } }
    },
    {
      type: 'screenshots', id: '4328782805',
      relationships: { image: { data: { type: 'images', id: '315938601' } } }
    },
    {
      type: 'screenshots', id: '4328781309',
      relationships: { image: { data: { type: 'images', id: '315938601' } } }
    },
    {
      type: 'screenshots', id: '4328782655',
      relationships: { image: { data: { type: 'images', id: '315938593' } } }
    },
    {
      type: 'screenshots', id: '4328781347',
      relationships: { image: { data: { type: 'images', id: '315938593' } } }
    },
    {
      type: 'screenshots', id: '4328782643',
      relationships: { image: { data: { type: 'images', id: '154218231' } } }
    },
    {
      type: 'screenshots', id: '4328781617',
      relationships: { image: { data: { type: 'images', id: '154218231' } } }
    },
    {
      type: 'screenshots', id: '4328782623',
      relationships: { image: { data: { type: 'images', id: '154218225' } } }
    },
    {
      type: 'screenshots', id: '4328781434',
      relationships: { image: { data: { type: 'images', id: '154218225' } } }
    },
    {
      type: 'screenshots', id: '4328782684',
      relationships: { image: { data: { type: 'images', id: '315262914' } } }
    },
    {
      type: 'screenshots', id: '4328781720',
      relationships: { image: { data: { type: 'images', id: '315262914' } } }
    },
    {
      type: 'screenshots', id: '4328782669',
      relationships: { image: { data: { type: 'images', id: '315262857' } } }
    },
    {
      type: 'screenshots', id: '4328781399',
      relationships: { image: { data: { type: 'images', id: '315262857' } } }
    },
    // --- Images ---
    { type: 'images', id: '226803255', attributes: { url: 'https://images.percy.io/dbb30facec649a0320f71226c3eba09891af4004d9657b1b58e3c089a1dea05a', width: 375, height: 1024 } },
    { type: 'images', id: '226737070', attributes: { url: 'https://images.percy.io/dc64982ead279b061e927fa6910a109448b6f65a6f7caaa17db618c32e836979', width: 1280, height: 1024 } },
    { type: 'images', id: '226737073', attributes: { url: 'https://images.percy.io/097ae4656ccdf27c30322dddc71962a03158996959bb1e9175a063104571771d', width: 1280, height: 1024 } },
    { type: 'images', id: '315938601', attributes: { url: 'https://images.percy.io/75b8695ac3bbf9f9988c77d5d64aa6c7aeff1c08de3db9e9e3f0c7aad6f4dc3b', width: 375, height: 1024 } },
    { type: 'images', id: '315938630', attributes: { url: 'https://images.percy.io/f6c690971c3695915f4d4c36f14f6de4d38146f981293fb8356376758486d834', width: 375, height: 1024 } },
    { type: 'images', id: '315938593', attributes: { url: 'https://images.percy.io/3d19405e5d437b098038075483324166ecda6ee1b16314329dacc574eb85eb57', width: 1280, height: 1024 } },
    { type: 'images', id: '315938631', attributes: { url: 'https://images.percy.io/0324ca2574016579015650bb37ed4f81f9bd71910e5a9b312856dcded9562438', width: 1280, height: 1024 } },
    { type: 'images', id: '154218231', attributes: { url: 'https://images.percy.io/d933064e4d4a2011f4a47db745c8aabb2c8d88d105eed5710897a0f911cb9835', width: 375, height: 1013 } },
    { type: 'images', id: '198388547', attributes: { url: 'https://images.percy.io/c408851e2fdc49edf5eef33a0eb7552c14fef27b870aab404aea0b783d32dc0c', width: 375, height: 1013 } },
    { type: 'images', id: '154218225', attributes: { url: 'https://images.percy.io/97ccdd4f069a0dd3496072d75f3ba3c763dd6b9a987822081d415f1da05fefe6', width: 1280, height: 1013 } },
    { type: 'images', id: '198388567', attributes: { url: 'https://images.percy.io/09d358084b791c560039f93e43b1280bd30f29c14bd28fc50867a4d82c003d34', width: 1280, height: 1013 } },
    { type: 'images', id: '315262914', attributes: { url: 'https://images.percy.io/3b64c99c7d5ab880fc0ad9785c7b8c2be672ec1d2c21c68b3bdee4768a05e06d', width: 375, height: 1024 } },
    { type: 'images', id: '315263004', attributes: { url: 'https://images.percy.io/b2c8bef5e748861b036c99f31b0a1c696def298b62e2138873d359ef2e2c8af1', width: 375, height: 1024 } },
    { type: 'images', id: '315262857', attributes: { url: 'https://images.percy.io/f142827830b6b9bd92a20415d90ce2772c18dcb90df8968c9dab8b149030c60d', width: 1280, height: 1024 } },
    { type: 'images', id: '315262894', attributes: { url: 'https://images.percy.io/d6b8d6d8bd41816d68453e5589b81d1bf243f444b169c2a899432e6adcf2cd3a', width: 1280, height: 1024 } },
    // --- Browsers ---
    { type: 'browsers', id: '63', attributes: { version: '17.3' }, relationships: { 'browser-family': { data: { type: 'browser-families', id: '4' } } } },
    { type: 'browsers', id: '69', attributes: { version: '137.0.7151.103' }, relationships: { 'browser-family': { data: { type: 'browser-families', id: '2' } } } },
    { type: 'browsers', id: '70', attributes: { version: '139.0.4' }, relationships: { 'browser-family': { data: { type: 'browser-families', id: '1' } } } },
    { type: 'browsers', id: '71', attributes: { version: '137.0.3296.52' }, relationships: { 'browser-family': { data: { type: 'browser-families', id: '3' } } } },
    // --- Browser families ---
    { type: 'browser-families', id: '1', attributes: { name: 'Firefox', slug: 'firefox' } },
    { type: 'browser-families', id: '2', attributes: { name: 'Chrome', slug: 'chrome' } },
    { type: 'browser-families', id: '3', attributes: { name: 'Edge', slug: 'edge' } },
    { type: 'browser-families', id: '4', attributes: { name: 'Safari', slug: 'safari' } },
    // --- Build (base) ---
    { type: 'builds', id: '47773075', attributes: { branch: 'main', 'build-number': 75657 } },
  ]
};

// ---------------------------------------------------------------------------
// JSON:API normalizer — builds a lookup map { type: { id: entity } }
// ---------------------------------------------------------------------------
function normalizeResponse(response) {
  const entities = {};

  function index(item) {
    if (!entities[item.type]) entities[item.type] = {};
    entities[item.type][item.id] = item;
  }

  index(response.data);
  (response.included || []).forEach(index);

  return entities;
}

function resolveImageUrl(entities, screenshotId) {
  const screenshot = entities.screenshots?.[screenshotId];
  if (!screenshot) return null;
  const imageId = screenshot.relationships?.image?.data?.id;
  const image = entities.images?.[imageId];
  return image?.attributes || null;
}

function resolveBrowser(entities, browserId) {
  const browser = entities.browsers?.[browserId];
  if (!browser) return { name: 'Unknown', version: '' };
  const familyId = browser.relationships?.['browser-family']?.data?.id;
  const family = entities['browser-families']?.[familyId];
  return {
    name: family?.attributes?.name || 'Unknown',
    version: browser.attributes?.version || '',
    id: browserId
  };
}

// ---------------------------------------------------------------------------
// Parse comparisons into a usable structure
// ---------------------------------------------------------------------------
function parseComparisons(apiResponse) {
  const entities = normalizeResponse(apiResponse);
  const snapshot = apiResponse.data;
  const comparisonIds = snapshot.relationships.comparisons.data.map((c) => c.id);

  return comparisonIds.map((id) => {
    const comparison = entities.comparisons[id];
    const attrs = comparison.attributes;
    const rels = comparison.relationships;

    const headScreenshotId = rels['head-screenshot']?.data?.id;
    const baseScreenshotId = rels['base-screenshot']?.data?.id;
    const browserId = rels.browser?.data?.id;

    const headImage = resolveImageUrl(entities, headScreenshotId);
    const baseImage = resolveImageUrl(entities, baseScreenshotId);
    const browser = resolveBrowser(entities, browserId);

    return {
      id,
      width: attrs.width,
      diffRatio: attrs['diff-ratio'],
      browser,
      headUrl: headImage?.url || null,
      headWidth: headImage?.width || attrs.width,
      headHeight: headImage?.height || 0,
      baselineUrl: baseImage?.url || null,
      baseWidth: baseImage?.width || attrs.width,
      baseHeight: baseImage?.height || 0,
      hasDiff: attrs['diff-ratio'] > 0
    };
  });
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const toolbarStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  padding: '8px 12px',
  background: '#1e1e2e',
  borderBottom: '1px solid #333',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 13
};

const btnBase = {
  padding: '5px 12px',
  borderRadius: 6,
  border: '1px solid #444',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  transition: 'all 0.15s ease'
};

const labelStyle = {
  color: '#999',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginRight: 4
};

const infoBarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 12px',
  background: '#f8f9fa',
  borderBottom: '1px solid #e0e0e0',
  fontSize: 12,
  color: '#555',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};

// ---------------------------------------------------------------------------
// Story: Percy Snapshot Viewer
// ---------------------------------------------------------------------------
export default {
  title: 'Snapshot/Percy Snapshot 2534506865',
  parameters: {
    percy: { skip: true },
    layout: 'fullscreen'
  }
};

export const InteractiveViewer = () => {
  const comparisons = useMemo(() => parseComparisons(API_RESPONSE), []);

  // Unique browsers and widths
  const browsers = useMemo(() => {
    const seen = new Map();
    comparisons.forEach((c) => {
      if (!seen.has(c.browser.id)) {
        seen.set(c.browser.id, c.browser);
      }
    });
    return Array.from(seen.values());
  }, [comparisons]);

  const widths = useMemo(
    () => [...new Set(comparisons.map((c) => c.width))].sort((a, b) => a - b),
    [comparisons]
  );

  const [selectedBrowserId, setSelectedBrowserId] = useState(browsers[0]?.id);
  const [selectedWidth, setSelectedWidth] = useState(widths[widths.length - 1]);
  const [viewMode, setViewMode] = useState('side-by-side');

  // Find matching comparison
  const activeComparison = useMemo(
    () =>
      comparisons.find(
        (c) => c.browser.id === selectedBrowserId && c.width === selectedWidth
      ),
    [comparisons, selectedBrowserId, selectedWidth]
  );

  const snapshotName = API_RESPONSE.data.attributes['display-name'];
  const hasNoVisualChanges = activeComparison && activeComparison.diffRatio === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <span style={labelStyle}>Browser:</span>
        {browsers.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBrowserId(b.id)}
            style={{
              ...btnBase,
              background: selectedBrowserId === b.id ? '#6366f1' : '#2a2a3e',
              color: selectedBrowserId === b.id ? '#fff' : '#aaa',
              borderColor: selectedBrowserId === b.id ? '#6366f1' : '#444'
            }}
          >
            {b.name} {b.version.split('.')[0]}
          </button>
        ))}

        <span style={{ ...labelStyle, marginLeft: 16 }}>Width:</span>
        {widths.map((w) => (
          <button
            key={w}
            onClick={() => setSelectedWidth(w)}
            style={{
              ...btnBase,
              background: selectedWidth === w ? '#6366f1' : '#2a2a3e',
              color: selectedWidth === w ? '#fff' : '#aaa',
              borderColor: selectedWidth === w ? '#6366f1' : '#444'
            }}
          >
            {w}px
          </button>
        ))}

        <span style={{ ...labelStyle, marginLeft: 16 }}>View:</span>
        {['side-by-side', 'overlay-head', 'overlay-baseline'].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              ...btnBase,
              background: viewMode === mode ? '#6366f1' : '#2a2a3e',
              color: viewMode === mode ? '#fff' : '#aaa',
              borderColor: viewMode === mode ? '#6366f1' : '#444'
            }}
          >
            {mode.replace(/-/g, ' ')}
          </button>
        ))}
      </div>

      {/* Info bar */}
      <div style={infoBarStyle}>
        <div>
          <strong>{snapshotName}</strong>
          <span style={{ marginLeft: 12, color: '#888' }}>
            Snapshot #{API_RESPONSE.data.id}
          </span>
          {activeComparison && (
            <span style={{ marginLeft: 12, color: '#888' }}>
              Comparison #{activeComparison.id}
            </span>
          )}
        </div>
        <div>
          {activeComparison && (
            <span>
              {activeComparison.headWidth} x {activeComparison.headHeight}
              <span style={{ marginLeft: 8, color: hasNoVisualChanges ? '#22c55e' : '#ef4444' }}>
                {hasNoVisualChanges ? 'No changes' : `${(activeComparison.diffRatio * 100).toFixed(2)}% diff`}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Viewer */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeComparison ? (
          <SnapshotViewer
            baselineUrl={activeComparison.baselineUrl}
            headUrl={activeComparison.headUrl}
            naturalWidth={activeComparison.headWidth}
            naturalHeight={activeComparison.headHeight}
            baselineState={activeComparison.baselineUrl ? 'compared' : 'new'}
            hasNoVisualChanges={hasNoVisualChanges}
            viewMode={viewMode}
            headBranch="build #47773121"
            baseBranch="main (build #75657)"
            loading={false}
          />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            No comparison found for this browser/width combination.
          </div>
        )}
      </div>
    </div>
  );
};

InteractiveViewer.storyName = 'Interactive Viewer';

/**
 * All comparisons rendered as a grid — one per browser+width combo.
 */
export const AllComparisons = () => {
  const comparisons = useMemo(() => parseComparisons(API_RESPONSE), []);

  return (
    <div style={{ padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>
        {API_RESPONSE.data.attributes['display-name']}
      </h2>
      <p style={{ margin: '0 0 16px', color: '#666', fontSize: 13 }}>
        Snapshot #{API_RESPONSE.data.id} &mdash; {comparisons.length} comparisons across{' '}
        {new Set(comparisons.map((c) => c.browser.id)).size} browsers
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: 16 }}>
        {comparisons.map((comp) => (
          <div
            key={comp.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#fafafa'
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                background: '#f0f0f0',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {comp.browser.name} {comp.browser.version.split('.')[0]}
              </span>
              <span style={{ color: '#888' }}>
                {comp.width}px &mdash; {comp.headWidth}x{comp.headHeight}
              </span>
              <span style={{ color: comp.hasDiff ? '#ef4444' : '#22c55e', fontWeight: 500 }}>
                {comp.hasDiff ? `${(comp.diffRatio * 100).toFixed(2)}% diff` : 'No changes'}
              </span>
            </div>
            <div style={{ height: 400 }}>
              <SnapshotViewer
                baselineUrl={comp.baselineUrl}
                headUrl={comp.headUrl}
                naturalWidth={comp.headWidth}
                naturalHeight={comp.headHeight}
                baselineState={comp.baselineUrl ? 'compared' : 'new'}
                hasNoVisualChanges={comp.diffRatio === 0}
                viewMode="side-by-side"
                headBranch="build #47773121"
                baseBranch="main"
                loading={false}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

AllComparisons.storyName = 'All Comparisons Grid';
