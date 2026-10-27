import React from 'react';

const Probe = ({ label }, { globals }) => (
  <p>{label}{globals?.text}</p>
);

export default {
  title: 'Parity/Viewport',
  component: Probe,
  args: { label: 'viewport' }
};

export const NoViewport = {};

export const LegacyDefault = {
  parameters: { viewport: { defaultViewport: 'mobile1' } }
};

export const NamedGlobal = {
  globals: { viewport: { value: 'tablet', isRotated: false } }
};

export const CustomPixel = {
  globals: { viewport: '500-700' }
};

export const CustomOption = {
  parameters: {
    viewport: {
      options: { kiosk: { name: 'Kiosk', styles: { width: '600px', height: '900px' }, type: 'other' } },
      viewports: { kiosk: { name: 'Kiosk', styles: { width: '600px', height: '900px' }, type: 'other' } },
      defaultViewport: 'kiosk'
    }
  }
};

export const PercyWidthsWin = {
  parameters: { viewport: { defaultViewport: 'mobile1' }, percy: { widths: [999] } }
};

export const OptedOut = {
  parameters: { viewport: { defaultViewport: 'mobile1' }, percy: { storyViewport: false } }
};
