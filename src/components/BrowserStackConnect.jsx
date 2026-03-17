import React, { useState, useEffect, useCallback, useRef } from 'react';
import { styled } from 'storybook/theming';
import { useChannel } from 'storybook/manager-api';
import { Alert, AlertTitle, AlertDescription, Button, InputField } from '@browserstack/design-stack';
import MdOutlineVisibility from '@browserstack/design-stack-icons/dist/MdOutlineVisibility';
import MdOutlineVisibilityOff from '@browserstack/design-stack-icons/dist/MdOutlineVisibilityOff';
import ArrowTopRightOnSquareIcon from '@browserstack/design-stack-icons/dist/ArrowTopRightOnSquareIcon';
import { PERCY_EVENTS } from '../constants.js';
import { validateCredentials } from '../utils/validateCredentials.js';

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
  font-size: 13px; color: #1a56db; text-decoration: none;
  display: inline-flex; align-items: center; gap: 5px; margin-top: 8px;
  &:hover { text-decoration: underline; }
`;

const EyeToggle = styled.button`
  all: unset; cursor: pointer; display: flex; align-items: center;
  color: ${p => p.theme.color.mediumdark};
  &:hover { color: ${p => p.theme.color.defaultText}; }
`;

/* ─── Component ─────────────────────────────────────────────────────────── */

export function BrowserStackConnect({ onAuthenticated, skipAutoValidate }) {
  const [username, setUsername] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(!skipAutoValidate);
  const autoValidated = useRef(false);
  const projectNameRef = useRef('');
  const usernameRef = useRef('');
  const accessKeyRef = useRef('');

  const autoValidate = useCallback(async (user, key) => {
    if (autoValidated.current || skipAutoValidate) {
      autoValidated.current = true;
      setLoading(false);
      return;
    }
    autoValidated.current = true;
    if (!user || !key) { setLoading(false); return; }
    try {
      await validateCredentials(user, key);
      onAuthenticated && onAuthenticated(user, key, projectNameRef.current);
    } catch {
      setValidationError('Saved credentials are invalid. Please re-enter.');
      setLoading(false);
    }
  }, [onAuthenticated]);

  const emit = useChannel({
    [PERCY_EVENTS.BS_CREDENTIALS_LOADED]: ({ username: u, accessKey: k, projectName: p }) => {
      setUsername(u || '');
      setAccessKey(k || '');
      usernameRef.current = u || '';
      accessKeyRef.current = k || '';
      projectNameRef.current = p || '';
      autoValidate(u, k);
    },
    [PERCY_EVENTS.BS_CREDENTIALS_SAVED]: ({ success, error }) => {
      if (success) { setSaveError(''); onAuthenticated && onAuthenticated(usernameRef.current, accessKeyRef.current, projectNameRef.current); }
      else { setSaveError(error || 'Failed to save credentials'); }
    }
  });

  useEffect(() => { emit(PERCY_EVENTS.LOAD_BS_CREDENTIALS); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleContinue() {
    const user = username.trim();
    const key = accessKey.trim();
    if (!user || !key) return;
    usernameRef.current = user;
    accessKeyRef.current = key;
    setValidationError(''); setSaveError(''); setLoading(true);
    try {
      await validateCredentials(user, key);
      emit(PERCY_EVENTS.SAVE_BS_CREDENTIALS, { username: user, accessKey: key });
    } catch (err) {
      setValidationError(err.message);
    } finally { setLoading(false); }
  }

  if (loading && !validationError && !saveError) {
    return (
      <Container>
        <Title>Connect to BrowserStack</Title>
        <Subtitle>Verifying your credentials…</Subtitle>
      </Container>
    );
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
          id="bs-username" label="BrowserStack Username (Email)" type="email"
          placeholder="user@example.com" value={username}
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
    </Container>
  );
}
