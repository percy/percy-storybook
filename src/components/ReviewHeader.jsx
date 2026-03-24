import React, { useState, useCallback } from 'react';
import {
  Badge, Button, Dropdown, DropdownOptionGroup, DropdownOptionItem, DropdownTrigger
} from '@browserstack/design-stack';
import {
  MdOutlineOpenInNew, MdKeyboardArrowDown, MdMoreVert,
  MdPlayArrow, MdOutlineSettings, MdOutlineFileDownload, MdClose, MdDeleteOutline
} from '@browserstack/design-stack-icons';
import { useChannel, useStorybookApi } from 'storybook/manager-api';
import { PERCY_EVENTS, SNAPSHOT_TYPES } from '../constants.js';
import { getReviewStateDisplay, formatDiffPercent } from '../utils/reviewState.js';
import {
  buildCurrentStoryPattern,
  buildCurrentTreePattern,
  getStorybookBaseUrl,
  resolveStoryIdsForScope
} from '../utils/storybookApi.js';

/* ─── Snapshot Selector ────────────────────────────────────────────────── */

function SnapshotSelector({ snapshots, selectedId, onSelect }) {
  const selected = snapshots.find(s => s.id === selectedId) || snapshots[0];
  if (!snapshots.length) return null;

  if (snapshots.length <= 1) {
    return <span className="text-sm font-medium truncate max-w-[260px]">{selected?.name}</span>;
  }

  const options = snapshots.map(snap => {
    const stateDisplay = getReviewStateDisplay(snap.reviewState, snap.reviewStateReason);
    const diffText = formatDiffPercent(snap.diffRatio);
    const parts = [diffText, stateDisplay?.label].filter(Boolean).join(' · ');

    return {
      id: snap.id,
      body: (
        <div className="flex items-center gap-2 w-full">
          <span className="flex-1 truncate">{snap.name}</span>
          {parts && <span className="text-xs text-neutral-weak whitespace-nowrap">{parts}</span>}
          {stateDisplay && ['success', 'error', 'warn', 'info'].includes(stateDisplay.color) && (
            <Badge text={stateDisplay.label} modifier={stateDisplay.color} size="basic" />
          )}
        </div>
      )
    };
  });

  return (
    <Dropdown align="start" side="bottom">
      <DropdownTrigger wrapperClassName="flex items-center gap-1.5 text-sm font-medium">
        <span className="truncate max-w-[200px]">{selected?.name || 'Select snapshot'}</span>
        <MdKeyboardArrowDown className="w-4 h-4 flex-shrink-0" />
      </DropdownTrigger>
      <DropdownOptionGroup>
        {options.map(opt => (
          <DropdownOptionItem
            key={opt.id}
            option={opt}
            onClick={() => onSelect(opt.id)}
          />
        ))}
      </DropdownOptionGroup>
    </Dropdown>
  );
}

/* ─── Review State Badge ───────────────────────────────────────────────── */

function ReviewStateBadge({ snapshot }) {
  if (!snapshot) return null;
  const display = getReviewStateDisplay(snapshot.reviewState, snapshot.reviewStateReason);
  // Skip badge for states without a valid design-stack Badge modifier (e.g. 'purple')
  if (!display || !['success', 'error', 'warn', 'info'].includes(display.color)) return null;
  return <Badge text={display.label} modifier={display.color} size="basic" />;
}

/* ─── Run Story Split Button ───────────────────────────────────────────── */

function RunStorySplitButton({ emit, currentStory }) {
  const api = useStorybookApi();
  const [triggered, setTriggered] = useState(false);

  const handleRun = useCallback((scope) => {
    if (!emit || triggered) return;

    let include = [];
    if (scope === SNAPSHOT_TYPES.CURRENT_STORY) {
      if (!currentStory) return;
      include = [buildCurrentStoryPattern(currentStory)];
    } else if (scope === SNAPSHOT_TYPES.CURRENT_TREE) {
      if (!currentStory) return;
      include = [buildCurrentTreePattern(currentStory)];
    }

    setTriggered(true);

    const storyIds = resolveStoryIdsForScope(api, scope, currentStory);
    window.__PERCY_SNAPSHOT_STATE__ = { isRunning: true, storyIds };

    emit(PERCY_EVENTS.RUN_SNAPSHOT, {
      baseUrl: getStorybookBaseUrl(),
      include,
      exclude: [],
      scope
    });
  }, [emit, currentStory, api, triggered]);

  return (
    <div className="inline-flex items-stretch">
      <Button
        variant="primary"
        colors="brand"
        size="small"
        icon={<MdPlayArrow />}
        onClick={() => handleRun(SNAPSHOT_TYPES.CURRENT_STORY)}
        disabled={triggered}
        loading={triggered}
        loaderText="Running…"
        wrapperClassName="!rounded-r-none"
      >
        Run story
      </Button>
      <Dropdown align="end" side="bottom">
        <DropdownTrigger
          isIconOnly
          icon={<MdKeyboardArrowDown className="w-4 h-4 text-white" />}
          colors="brand"
          disabled={triggered}
          wrapperClassName="!rounded-l-none !rounded-r-md !border-l !border-l-white/30 h-full [&_.icon-neutral-strong]:!text-white"
          triggerAriaLabel="More run options"
        />
        <DropdownOptionGroup>
          <DropdownOptionItem
            option={{ id: 'run-component', body: 'Run component' }}
            onClick={() => handleRun(SNAPSHOT_TYPES.CURRENT_TREE)}
          />
          <DropdownOptionItem
            option={{ id: 'run-all', body: 'Run all stories' }}
            onClick={() => handleRun(SNAPSHOT_TYPES.FULL)}
          />
        </DropdownOptionGroup>
      </Dropdown>
    </div>
  );
}

/* ─── Kebab Menu ───────────────────────────────────────────────────────── */

function KebabMenu({ buildId, webUrl, onBack }) {
  const [actionLoading, setActionLoading] = useState(null);

  const channelEmit = useChannel({
    [PERCY_EVENTS.BUILD_REJECTED]: (data) => {
      setActionLoading(null);
      if (data.success) onBack();
    },
    [PERCY_EVENTS.BUILD_DELETED]: (data) => {
      setActionLoading(null);
      if (data.success) onBack();
    },
    [PERCY_EVENTS.BUILD_LOGS_DOWNLOADED]: (data) => {
      setActionLoading(null);
      if (data.content) {
        const blob = new Blob([data.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || 'percy-build.log';
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  });

  const settingsUrl = webUrl
    ? webUrl.replace(/\/builds\/\d+$/, '/settings')
    : null;

  const handleMenuAction = useCallback((optionId) => {
    switch (optionId) {
      case 'project-settings':
        if (settingsUrl) window.open(settingsUrl, '_blank');
        break;
      case 'download-logs':
        setActionLoading('download-logs');
        channelEmit(PERCY_EVENTS.DOWNLOAD_BUILD_LOGS, { buildId });
        break;
      case 'reject-build':
        setActionLoading('reject-build');
        channelEmit(PERCY_EVENTS.REJECT_BUILD, { buildId });
        break;
      case 'delete-build':
        setActionLoading('delete-build');
        channelEmit(PERCY_EVENTS.DELETE_BUILD, { buildId });
        break;
    }
  }, [buildId, settingsUrl, channelEmit]);

  return (
    <Dropdown align="end" side="bottom">
      <DropdownTrigger
        isIconOnly
        icon={<MdMoreVert className="w-5 h-5" />}
        triggerAriaLabel="More actions"
        wrapperClassName="!border-transparent !shadow-none"
      />
      <DropdownOptionGroup>
        {settingsUrl && (
          <DropdownOptionItem
            option={{ id: 'project-settings', body: 'Project settings', icon: <MdOutlineSettings className="w-4 h-4" /> }}
            onClick={() => handleMenuAction('project-settings')}
          />
        )}
        <DropdownOptionItem
          option={{ id: 'download-logs', body: 'Download logs', icon: <MdOutlineFileDownload className="w-4 h-4" /> }}
          onClick={() => handleMenuAction('download-logs')}
        />
        <DropdownOptionItem
          option={{ id: 'reject-build', body: 'Reject build', icon: <MdClose className="w-4 h-4" /> }}
          onClick={() => handleMenuAction('reject-build')}
        />
        <DropdownOptionItem
          option={{ id: 'delete-build', body: 'Delete build', icon: <MdDeleteOutline className="w-4 h-4" />, destructive: true }}
          onClick={() => handleMenuAction('delete-build')}
        />
      </DropdownOptionGroup>
    </Dropdown>
  );
}

/* ─── Main Header Export ───────────────────────────────────────────────── */

export default function ReviewHeader({
  buildNumber, webUrl, buildId, currentSnapshots, selectedSnapshotId,
  onSelectSnapshot, emit, currentStory, onBack
}) {
  const selectedSnapshot = currentSnapshots.find(s => s.id === selectedSnapshotId) || currentSnapshots[0];

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-default flex-shrink-0">
      {/* Left: build number + snapshot selector + badges */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-base font-semibold flex-shrink-0">#{buildNumber}</span>
        <SnapshotSelector
          snapshots={currentSnapshots}
          selectedId={selectedSnapshotId}
          onSelect={onSelectSnapshot}
        />
        <ReviewStateBadge snapshot={selectedSnapshot} />
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {webUrl && (
          <a href={webUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="small" icon={<MdOutlineOpenInNew />} iconPlacement="end">
              Review in Percy
            </Button>
          </a>
        )}
        <RunStorySplitButton emit={emit} currentStory={currentStory} />
        <KebabMenu buildId={buildId} webUrl={webUrl} onBack={onBack} />
      </div>
    </div>
  );
}
