import React, { lazy, Suspense } from 'react';
import { LoaderV2 } from '@browserstack/design-stack';

const ReviewPage = lazy(() => import('./ReviewPage'));

/**
 * Lazy-load wrapper for ReviewPage.
 * Keeps the review-viewer + Redux Toolkit out of the initial manager.js bundle.
 * The review chunk is loaded only when a build finishes and enters review mode.
 */
export function ReviewPageLoader(props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <LoaderV2 size="medium" showLabel label="Loading review..." />
      </div>
    }>
      <ReviewPage {...props} />
    </Suspense>
  );
}
