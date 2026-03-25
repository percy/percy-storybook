import React, { useEffect, useRef } from 'react';
import { Button, LoaderV2 } from '@browserstack/design-stack';
import { MdOutlineOpenInNew } from '@browserstack/design-stack-icons';
import { BUILD_STATES } from '../constants.js';
import { useBuildPolling } from '../hooks/useBuildPolling.js';
import { InProgressBuild } from './InProgressBuild';
import { FailedBuild } from './FailedBuild';
import { ProgressWrapper, ProgressHeader, ProgressBody } from './BuildProgress.styles.js';

export function BuildProgress({ buildId, buildUrl, buildNumber, snapshotScope, onBack, onReviewReady }) {
  const {
    buildData, state, elapsedTime, avgBuildTime,
    progressPercent, pollError, downloadLogs, logDownload
  } = useBuildPolling(buildId);

  const webUrl = buildData?.webUrl || buildUrl;
  const displayNumber = buildData?.buildNumber || buildNumber;
  const isFailed = state === BUILD_STATES.FAILED;
  const isFinished = state === BUILD_STATES.FINISHED;
  const isLoading = !buildData && !pollError;

  // Transition to review page when build finishes — ref guard prevents double-fire
  const reviewTransitionedRef = useRef(false);
  useEffect(() => {
    if (isFinished && buildData && !reviewTransitionedRef.current) {
      reviewTransitionedRef.current = true;
      onReviewReady({
        buildId: buildData.buildId || buildId,
        buildNumber: buildData.buildNumber || buildNumber,
        webUrl: buildData.webUrl || buildUrl,
        reviewState: buildData.reviewState,
        reviewStateReason: buildData.reviewStateReason,
        headBranch: buildData.headBranch,
        baseBranch: buildData.baseBranch,
        meta: buildData.meta
      });
    }
  }, [isFinished, buildData]);

  return (
    <ProgressWrapper>
      {/* Header — build number + actions */}
      <ProgressHeader>
        <span className="text-lg font-semibold">#{displayNumber}</span>
        <div className="flex items-center gap-3">
          {webUrl && (
            <a href={webUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="minimal" size="small" icon={<MdOutlineOpenInNew />} iconPlacement="end">
                Review in Percy
              </Button>
            </a>
          )}
          {isFailed && webUrl && (
            <a href={webUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="primary" colors="white" size="small" icon={<MdOutlineOpenInNew />} iconPlacement="end">
                Debug in Percy
              </Button>
            </a>
          )}
        </div>
      </ProgressHeader>

      {/* Poll error */}
      {pollError && (
        <div className="px-4 pt-3">
          <div className="p-3 rounded-md bg-danger-weaker text-danger-default text-sm">
            Failed to fetch build status. Will retry automatically.
          </div>
        </div>
      )}

      <ProgressBody>
        {/* Loading or In-progress: show skeleton + progress */}
        {(isLoading || state === BUILD_STATES.PENDING || state === BUILD_STATES.PROCESSING) && (
          <InProgressBuild
            state={isLoading ? BUILD_STATES.PENDING : state}
            totalSnapshots={buildData?.totalSnapshots}
            totalComparisons={buildData?.totalComparisons}
            totalComparisonsFinished={buildData?.totalComparisonsFinished}
            progressPercent={progressPercent}
            elapsedTime={elapsedTime}
            avgBuildTime={avgBuildTime}
            buildCountForAverage={buildData?.buildCountForAverage}
            snapshotScope={snapshotScope}
          />
        )}

        {/* Failed */}
        {isFailed && (
          <FailedBuild
            onRetry={onBack}
            onDownloadLogs={downloadLogs}
            isDownloading={logDownload.loading}
            downloadError={logDownload.error}
          />
        )}

        {/* Finished — brief loading while transitioning to review */}
        {isFinished && (
          <div className="flex flex-col items-center gap-4 py-8">
            <LoaderV2 size="medium" showLabel label="Loading review..." />
          </div>
        )}
      </ProgressBody>
    </ProgressWrapper>
  );
}
