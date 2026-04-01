import React, { useState, useCallback } from 'react';
import {
  Button, Dropdown, DropdownOptionGroup, DropdownOptionItem, DropdownTrigger, Tooltip
} from '@browserstack/design-stack';
import {
  MdOutlineOpenInNew, MdKeyboardArrowDown, MdMoreVert,
  MdPlayArrow, MdOutlineSettings, MdOutlineFileDownload, MdCheck, MdClose, MdDeleteOutline
} from '@browserstack/design-stack-icons';
import { useChannel, useStorybookApi } from 'storybook/manager-api';
import { useTheme } from 'storybook/theming';
import { PERCY_EVENTS, SNAPSHOT_TYPES } from '../constants.js';
import { getReviewStateDisplay, formatDiffPercent } from '../utils/reviewState.js';
import {
  buildCurrentStoryPattern,
  buildCurrentTreePattern,
  getStorybookBaseUrl,
  resolveStoryIdsForScope
} from '../utils/storybookApi.js';

/* ─── Snapshot Selector ────────────────────────────────────────────────── */

export function SnapshotSelector({ snapshots, selectedId, onSelect }) {
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
        <div className="flex items-center gap-2 w-full min-w-0">
          <span className="font-medium whitespace-nowrap">{snap.name}</span>
          {parts && <span className="text-xs text-neutral-weak whitespace-nowrap flex-shrink-0">{parts}</span>}
        </div>
      )
    };
  });

  return (
    <Dropdown align="start" side="bottom">
      <DropdownTrigger wrapperClassName="flex items-center gap-1.5 text-sm font-medium">
        <span className="truncate max-w-[50ch]">{selected?.name || 'Select snapshot'}</span>
        <MdKeyboardArrowDown className="w-4 h-4 flex-shrink-0" />
      </DropdownTrigger>
      <DropdownOptionGroup wrapperClassName="min-w-[400px]">
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

/* ─── Run Story Split Button ───────────────────────────────────────────── */

function RunStorySplitButton({ emit, currentStory }) {
  const api = useStorybookApi();
  const theme = useTheme();
  const tooltipTheme = theme?.base === 'dark' ? 'dark' : 'light';
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
      <Tooltip
        content="Very Fast - Test only the current story"
        theme={tooltipTheme}
        placementSide="top"
      >
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
      </Tooltip>
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
            option={{
              id: 'run-component',
              body: (
                <Tooltip content="Fast - Test stories in the current component folder" theme={tooltipTheme} placementSide="left">
                  <span>Run component</span>
                </Tooltip>
              )
            }}
            onClick={() => handleRun(SNAPSHOT_TYPES.CURRENT_TREE)}
          />
          <DropdownOptionItem
            option={{
              id: 'run-all',
              body: (
                <Tooltip content="Full Suite - Test all stories in the project" theme={tooltipTheme} placementSide="left">
                  <span>Run all stories</span>
                </Tooltip>
              )
            }}
            onClick={() => handleRun(SNAPSHOT_TYPES.FULL)}
          />
        </DropdownOptionGroup>
      </Dropdown>
    </div>
  );
}

/* ─── Kebab Menu ───────────────────────────────────────────────────────── */

function KebabMenu({ buildId, webUrl, reviewState, onBack, onApproved }) {
  const [, setActionLoading] = useState(null);

  const channelEmit = useChannel({
    [PERCY_EVENTS.BUILD_APPROVED]: (data) => {
      setActionLoading(null);
      if (data.success && onApproved) onApproved();
    },
    [PERCY_EVENTS.BUILD_REJECTED]: (data) => {
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

  const isApproved = reviewState === 'approved';

  const handleMenuAction = useCallback((optionId) => {
    switch (optionId) {
      case 'project-settings':
        if (settingsUrl) window.open(settingsUrl, '_blank');
        break;
      case 'download-logs':
        window.open(
          `https://percy.io/api/v1/logs?build_id=${buildId}&service_name=cli`,
          '_blank'
        );
        break;
      case 'approve-build':
        if (!isApproved) {
          setActionLoading('approve-build');
          channelEmit(PERCY_EVENTS.APPROVE_BUILD, { buildId });
        }
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
  }, [buildId, settingsUrl, channelEmit, isApproved]);

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
          disabled={isApproved}
          option={{ id: 'approve-build', body: 'Approve build', icon: <MdCheck className="w-4 h-4" /> }}
          onClick={() => handleMenuAction('approve-build')}
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
  buildNumber, webUrl, buildId, reviewState, currentSnapshots, selectedSnapshotId,
  emit, currentStory, onBack, onApproved
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-default flex-shrink-0">
      {/* Left: build number + review state badge */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-base font-semibold flex-shrink-0">#{buildNumber}</span>
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
        <KebabMenu buildId={buildId} webUrl={webUrl} reviewState={reviewState} onBack={onBack} onApproved={onApproved} />
      </div>
    </div>
  );
}
