import React from 'react';
import { Button } from '@browserstack/design-stack';
import MdRefresh from '@browserstack/design-stack-icons/dist/MdRefresh';
import MdDownload from '@browserstack/design-stack-icons/dist/MdDownload';
import MdErrorOutline from '@browserstack/design-stack-icons/dist/MdErrorOutline';

export const FailedBuild = React.memo(function FailedBuild({
  onRetry,
  onDownloadLogs,
  isDownloading,
  downloadError
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 w-full max-w-md">
      <MdErrorOutline className="h-12 w-12 text-danger-default" />

      <h3 className="text-lg font-semibold text-neutral-default">Build Failed</h3>

      <p className="text-sm text-neutral-weaker text-center">
        Please check your CI or try again. If the issue persists, contact support.
      </p>

      <div className="flex flex-col items-center gap-3 pt-2">
        <Button
          variant="primary"
          onClick={onRetry}
          icon={<MdRefresh />}
        >
          Retry
        </Button>
        <Button
          variant="minimal"
          onClick={onDownloadLogs}
          loading={isDownloading}
          loaderText="Downloading…"
          icon={<MdDownload />}
        >
          Download logs
        </Button>
      </div>

      {downloadError && (
        <p className="text-xs text-danger-default text-center mt-1">
          {downloadError}
        </p>
      )}
    </div>
  );
});
