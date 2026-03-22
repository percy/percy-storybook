import React from 'react';
import { BUILD_STATES } from '../constants.js';

/* ─── Skeleton animation matching Figma design ────────────────────────── */

function ProcessingAnimation() {
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <div className="flex gap-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="rounded-lg border-2 border-dashed border-neutral-default bg-raised-default"
            style={{ width: i === 2 ? 56 : 72, height: i === 2 ? 56 : 72, opacity: 0.6 + i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Component ───────────────────────────────────────────────────────── */

export const InProgressBuild = React.memo(function InProgressBuild({
  state,
  totalSnapshots,
  totalComparisons,
  totalComparisonsFinished,
  elapsedTime,
  avgBuildTime,
  buildCountForAverage
}) {
  const isPending = state === BUILD_STATES.PENDING;

  return (
    <div className="flex flex-col items-center gap-6 py-4 w-full max-w-md">
      <ProcessingAnimation />

      <h3 className="text-lg font-semibold text-neutral-default text-center">
        {isPending
          ? `${totalSnapshots ?? 0} snapshots received`
          : `Processing visual changes ${totalComparisonsFinished ?? 0}/${totalComparisons ?? 0}`
        }
      </h3>

      <div className="flex items-center gap-2 text-sm text-neutral-weaker">
        <span>
          Total time elapsed: <strong>{elapsedTime}</strong>
        </span>
        {buildCountForAverage >= 10 && avgBuildTime && (
          <>
            <span className="h-1 w-1 rounded-full bg-neutral-strong" />
            <span>
              Avg. build time: <strong>{avgBuildTime}</strong>
            </span>
          </>
        )}
      </div>
    </div>
  );
});
