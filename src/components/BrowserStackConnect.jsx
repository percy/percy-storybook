import React, { useState, useEffect, useRef } from 'react';
import { styled } from 'storybook/theming';
import { useChannel } from 'storybook/manager-api';
import {
  Alert, AlertTitle, AlertDescription, Button, InputField,
  Modal, ModalHeader, ModalBody, ModalFooter
} from '@browserstack/design-stack';
import MdOutlineVisibility from '@browserstack/design-stack-icons/dist/MdOutlineVisibility';
import MdOutlineVisibilityOff from '@browserstack/design-stack-icons/dist/MdOutlineVisibilityOff';
import ArrowTopRightOnSquareIcon from '@browserstack/design-stack-icons/dist/ArrowTopRightOnSquareIcon';
import { MdInfoOutline } from '@browserstack/design-stack-icons';
import { PERCY_EVENTS } from '../constants.js';

/* ─── Styled components (layout only) ──────────────────────────────────── */

const Container = styled.div`width: 100%;`;

const Title = styled.h2`
  margin: 0 0 8px; font-size: 24px; font-weight: 700;
  text-align: center; color: ${p => p.theme.color.defaultText};
`;

const Subtitle = styled.p`
  margin: 0 0 24px; font-size: 14px; text-align: center;
  color: ${p => p.theme.color.mediumdark}; line-height: 1.5;
`;

const FieldWrapper = styled.div`margin-bottom: 20px;`;
const AlertWrapper = styled.div`margin-bottom: 28px;`;

const InfoLink = styled.a`
  font-size: 13px; color: ${p => p.theme.color.secondary}; text-decoration: none;
  display: inline-flex; align-items: center; gap: 5px; margin-top: 8px;
  &:hover { text-decoration: underline; }
`;

const EyeToggle = styled.button`
  all: unset; cursor: pointer; display: flex; align-items: center;
  color: ${p => p.theme.color.mediumdark};
  &:hover { color: ${p => p.theme.color.defaultText}; }
`;

/* ─── Component ─────────────────────────────────────────────────────────── */

export function BrowserStackConnect({ onAuthenticated }) {
  const [username, setUsername] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const usernameRef = useRef('');
  const accessKeyRef = useRef('');
  // Track whether credentials were loaded from .env on mount (re-auth vs first-time)
  const hadExistingCreds = useRef(false);

  const emit = useChannel({
    [PERCY_EVENTS.BS_CREDENTIALS_LOADED]: ({ username: u, accessKey: k }) => {
      setUsername(u || '');
      setAccessKey(k || '');
      usernameRef.current = u || '';
      accessKeyRef.current = k || '';
      hadExistingCreds.current = !!(u && k);
    },
    [PERCY_EVENTS.CREDENTIALS_VALIDATED]: ({ valid, error }) => {
      if (valid) {
        setValidationError('');
        // Re-auth (credentials already in .env) — skip consent, save directly
        if (hadExistingCreds.current) {
          emit(PERCY_EVENTS.SAVE_BS_CREDENTIALS, {
            username: usernameRef.current,
            accessKey: accessKeyRef.current
          });
        } else {
          // First-time — show consent before writing to .env
          setLoading(false);
          setShowConsent(true);
        }
      } else {
        setValidationError(error || 'Username/Access Key is incorrect');
        setLoading(false);
      }
    },
    [PERCY_EVENTS.BS_CREDENTIALS_SAVED]: ({ success, error }) => {
      setLoading(false);
      if (success) {
        setSaveError('');
        onAuthenticated && onAuthenticated(usernameRef.current, accessKeyRef.current, false);
      } else {
        setSaveError(error || 'Failed to save credentials');
      }
    }
  });

  useEffect(() => { emit(PERCY_EVENTS.LOAD_BS_CREDENTIALS); }, []); // eslint-disable-line

  function handleContinue() {
    const user = username.trim();
    const key = accessKey.trim();
    if (!user || !key) return;
    usernameRef.current = user;
    accessKeyRef.current = key;
    setValidationError(''); setSaveError(''); setLoading(true);
    emit(PERCY_EVENTS.VALIDATE_CREDENTIALS, { username: user, accessKey: key });
  }

  function handleConsentAccept() {
    setShowConsent(false);
    setLoading(true);
    emit(PERCY_EVENTS.SAVE_BS_CREDENTIALS, {
      username: usernameRef.current,
      accessKey: accessKeyRef.current
    });
  }

  function handleConsentDecline() {
    setShowConsent(false);
    // Session-only mode: push credentials to the server's in-memory cache
    // so server handlers (build polling, project fetch, etc.) can use them
    // without reading from .env.
    emit(PERCY_EVENTS.SET_SESSION_CREDENTIALS, {
      username: usernameRef.current,
      accessKey: accessKeyRef.current
    });
    onAuthenticated && onAuthenticated(usernameRef.current, accessKeyRef.current, true);
  }

  return (
    <Container>
      <Title>Connect to BrowserStack</Title>
      <Subtitle>Enter your BrowserStack credentials to access Percy visual testing</Subtitle>

      <AlertWrapper>
        <Alert variant="info">
          <AlertTitle>Where to find your credentials</AlertTitle>
          <AlertDescription>
            You can find your Username and Access Key in your BrowserStack account settings
            <br />
            <InfoLink href="https://www.browserstack.com/accounts/profile/details" target="_blank" rel="noopener noreferrer">
              Open BrowserStack Settings <ArrowTopRightOnSquareIcon width={13} height={13} />
            </InfoLink>
          </AlertDescription>
        </Alert>
      </AlertWrapper>

      <FieldWrapper>
        <InputField
          id="bs-username" label="BrowserStack Username"
          placeholder="Enter your username" value={username}
          onChange={e => { setUsername(e.target.value); setSaveError(''); setValidationError(''); }}
          autoComplete="username"
        />
      </FieldWrapper>

      <FieldWrapper>
        <InputField
          id="bs-access-key" label="BrowserStack Access Key"
          type={showAccessKey ? 'text' : 'password'} placeholder="Enter your access key"
          value={accessKey}
          onChange={e => { setAccessKey(e.target.value); setSaveError(''); setValidationError(''); }}
          autoComplete="current-password" errorText={validationError || undefined}
          addOnAfterInline={
            <EyeToggle type="button" onClick={() => setShowAccessKey(v => !v)}
              aria-label={showAccessKey ? 'Hide access key' : 'Show access key'}>
              {showAccessKey ? <MdOutlineVisibility /> : <MdOutlineVisibilityOff />}
            </EyeToggle>
          }
        />
      </FieldWrapper>

      <Button variant="primary" colors="brand" fullWidth onClick={handleContinue}
        disabled={loading || !username.trim() || !accessKey.trim()}
        loading={loading} loaderText="Verifying…">
        Continue
      </Button>

      {saveError && (
        <div style={{ marginTop: 14 }}>
          <Alert variant="error"><AlertDescription>{saveError}</AlertDescription></Alert>
        </div>
      )}

      {/* Consent dialog — shown after validation, before .env write */}
      <Modal show={showConsent} onOverlayClick={() => {}} size="sm">
        <ModalHeader heading="Store credentials locally?" icon={<MdInfoOutline />} />
        <ModalBody>
          <p className="text-sm text-neutral-default">
            Your BrowserStack username and access key will be saved to{' '}
            <code className="text-xs font-mono bg-neutral-strongest px-1 py-0.5 rounded">.env</code>{' '}
            in your project root so the addon can authenticate automatically.
          </p>
          <p className="text-sm text-neutral-weaker mt-2">
            Make sure <code className="text-xs font-mono bg-neutral-strongest px-1 py-0.5 rounded">.env</code> is
            in your <code className="text-xs font-mono bg-neutral-strongest px-1 py-0.5 rounded">.gitignore</code>.
          </p>
        </ModalBody>
        <ModalFooter position="right">
          <Button variant="primary" colors="white" onClick={handleConsentDecline}>
            Not now
          </Button>
          <Button variant="primary" onClick={handleConsentAccept}>
            Save to .env
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
}
