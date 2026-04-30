/**
 * React 19 compatibility shim for Storybook 10 manager.
 *
 * Storybook 10 ships PRODUCTION React 19 in its manager (__REACT__). When SB
 * rebundles addons in dev mode, it includes react-jsx-runtime.development.js,
 * whose top-level evaluation reads:
 *
 *   var ReactSharedInternals =
 *     React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
 *
 * In prod React 19 that property is stripped → undefined → every jsx() call
 * crashes with "Cannot read properties of undefined (reading
 * 'recentlyCreatedOwnerStacks')". The whole manager UI then unmounts via
 * ManagerErrorBoundary, leaving a blank sidebar.
 *
 * This shim creates __CLIENT_INTERNALS_* with stub dev fields BEFORE the dev
 * jsx-runtime module evaluates. Storybook's bundler lazy-inits jsx-runtime on
 * the first _jsx() call (from our PanelTitle render), and this shim runs at
 * manager.jsx module-init time — well before any panel renders. Order is
 * therefore guaranteed.
 *
 * Stubs are safe in production: dev-mode owner tracking and debug stacks are
 * never surfaced in the manager UI.
 *
 * Must be the FIRST import in manager.jsx.
 */
import React from 'react';

const PRIMARY_KEY = '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE';
const LEGACY_KEY = '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED';

function makeStubInternals() {
  return {
    // jsx-dev-runtime owner-stack counter; incremented per jsx() call
    recentlyCreatedOwnerStacks: 0,
    // Current dispatcher container; getOwner() returns the active component owner
    A: { getOwner: () => null },
    // Legacy debug frame — older paths look here for stack addenda
    ReactDebugCurrentFrame: { getStackAddendum: () => '' }
  };
}

let internals = React[PRIMARY_KEY] || React[LEGACY_KEY];

// Prod React 19 strips __CLIENT_INTERNALS_* entirely → create a stub.
if (!internals) {
  internals = makeStubInternals();
  React[PRIMARY_KEY] = internals;
}

// Backfill missing fields on existing internals (handles partial strips and
// older variants that ship some but not all dev fields).
if (typeof internals.recentlyCreatedOwnerStacks !== 'number') {
  internals.recentlyCreatedOwnerStacks = 0;
}
if (!internals.A || typeof internals.A.getOwner !== 'function') {
  internals.A = { getOwner: () => null };
}
if (!internals.ReactDebugCurrentFrame) {
  internals.ReactDebugCurrentFrame = { getStackAddendum: () => '' };
}
if (typeof internals.ReactDebugCurrentFrame.getStackAddendum !== 'function') {
  internals.ReactDebugCurrentFrame.getStackAddendum = () => '';
}
