/**
 * Percy Storybook Addon – Manager entry-point (browser ESM)
 *
 * Storybook loads this file in the manager bundle (browser context).
 * It registers the Percy panel so it appears next to the Actions / Controls tabs.
 */

import './src/react19Shim.js';
import './src/styles/manager.scss';
import React from 'react';
import { addons, types } from 'storybook/manager-api';
import { PercyPanel } from './src/components/PercyPanel';
import { PercyIcon } from './src/components/PercyIcon';
import { SidebarLabel } from './src/components/SidebarLabel';
import { ADDON_ID, PANEL_ID } from './src/constants.js';

function PanelTitle() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <PercyIcon />
      Percy
    </span>
  );
}

addons.register(ADDON_ID, () => {
  // Customize sidebar labels to show snapshot status on stories
  addons.setConfig({
    sidebar: {
      renderLabel: (item) => <SidebarLabel item={item} />
    }
  });

  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: PanelTitle,
    match: ({ viewMode }) => !!viewMode?.match(/^(story|docs)$/),
    render: ({ active }) => <PercyPanel active={active} />
  });
});
