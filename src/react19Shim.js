/**
 * React 19 compatibility shim.
 *
 * Storybook 10 runs React 19 in its manager. Bundled @browserstack/design-stack
 * components (compiled for React 18) define propTypes, which triggers React's
 * dev-mode JSX validation path (jsxWithValidation -> printWarning). In React 19,
 * ReactSharedInternals was restructured and getStackAddendum was removed, causing:
 *   TypeError: Cannot read properties of undefined (reading 'getStackAddendum')
 *
 * This shim patches the missing function so dev-mode warnings work without crashing.
 * Must be imported before any component that uses propTypes.
 */
import React from 'react';

const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ||
  React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

if (internals) {
  if (internals.ReactDebugCurrentFrame && typeof internals.ReactDebugCurrentFrame.getStackAddendum !== 'function') {
    internals.ReactDebugCurrentFrame.getStackAddendum = () => '';
  }
  if (!internals.ReactDebugCurrentFrame) {
    internals.ReactDebugCurrentFrame = { getStackAddendum: () => '' };
  }
}
