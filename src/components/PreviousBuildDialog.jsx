import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from '@browserstack/design-stack';
import { MdInfoOutline } from '@browserstack/design-stack-icons';

/**
 * Confirmation dialog shown when the user tries to run a new snapshot
 * while a previous FINISHED build exists. Warns that previous comparisons
 * on other stories will no longer be visible in the addon.
 */
export function PreviousBuildDialog({ isOpen, onCancel, onContinue, isLoading }) {
  return (
    <Modal show={isOpen} onOverlayClick={onCancel} size="sm">
      <ModalHeader heading="Previous build" icon={<MdInfoOutline />} />
      <ModalBody>
        <p className="text-sm text-neutral-default">
          Are you sure you want to run this story? Previous build comparisons
          on other stories will not be visible. You can find them on{' '}
          <a
            href="https://percy.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-default hover:underline"
          >
            Percy.io
          </a>{' '}
          or run all stories.
        </p>
      </ModalBody>
      <ModalFooter position="right">
        <Button variant="primary" colors="white" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onContinue} disabled={isLoading} loading={isLoading}>
          Continue
        </Button>
      </ModalFooter>
    </Modal>
  );
}
