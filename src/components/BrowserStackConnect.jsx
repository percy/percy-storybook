import React, { useState, useEffect } from 'react';
import { styled } from 'storybook/theming';
import { useChannel } from 'storybook/manager-api';
import { PERCY_EVENTS } from '../constants.js';

/* ─── Styled components ─────────────────────────────────────────────────── */

const Container = styled.div`
  width: 100%;
  max-width: 600px;
`;

const Title = styled.h2`
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  color: ${p => p.theme.color.defaultText};
`;

const Subtitle = styled.p`
  margin: 0 0 24px;
  font-size: 14px;
  text-align: center;
  color: ${p => p.theme.color.mediumdark};
  line-height: 1.5;
`;

const InfoBox = styled.div`
  background: #e8f0fe;
  border-radius: 8px;
  padding: 16px 18px;
  margin-bottom: 28px;
`;

const InfoTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1a56db;
  margin-bottom: 8px;
`;

const InfoText = styled.p`
  margin: 0 0 10px;
  font-size: 13px;
  color: #1a56db;
  line-height: 1.5;
`;

const InfoLink = styled.a`
  font-size: 13px;
  color: #1a56db;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  &:hover { text-decoration: underline; }
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${p => p.theme.color.defaultText};
  margin-bottom: 6px;
`;

const InputWrapper = styled.div`
  position: relative;
  margin-bottom: 20px;
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 11px 44px 11px 14px;
  font-size: 14px;
  border: 1.5px solid ${p => p.theme.appBorderColor};
  border-radius: 6px;
  background: ${p => p.theme.background.content};
  color: ${p => p.theme.color.defaultText};
  outline: none;
  &:focus { border-color: #3b82f6; }
`;

const EyeButton = styled.button`
  all: unset;
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: ${p => p.theme.color.mediumdark};
  display: flex;
  align-items: center;
  &:hover { color: ${p => p.theme.color.defaultText}; }
`;

const AuthButton = styled.button`
  all: unset;
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 14px;
  background: #3b5bdb;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: #2f4acb; }
  &:active { background: #2540bb; }
  &:disabled { background: #9ca3af; cursor: default; }
`;

const FeedbackBadge = styled.div`
  margin-top: 14px;
  padding: 9px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  background: ${p => p.error ? '#fee2e2' : '#dcfce7'};
  color: ${p => p.error ? '#b91c1c' : '#15803d'};
`;

const ErrorText = styled.p`
  margin: -12px 0 14px;
  font-size: 12px;
  color: #b91c1c;
`;

/* ─── Eye icons (inline SVG) ────────────────────────────────────────────── */

function EyeOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#1a56db"/>
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">i</text>
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function BrowserStackConnect({ onAuthenticated }) {
  const [username, setUsername] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [showUsername, setShowUsername] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);

  const emit = useChannel({
    [PERCY_EVENTS.BS_CREDENTIALS_LOADED]: ({ username: u, accessKey: k }) => {
      setUsername(u || '');
      setAccessKey(k || '');
    },
    [PERCY_EVENTS.BS_CREDENTIALS_SAVED]: ({ success, error }) => {
      if (success) {
        setSaveError('');
        onAuthenticated && onAuthenticated();
      } else {
        setSaveError(error || 'Failed to save credentials');
      }
    }
  });

  useEffect(() => {
    emit(PERCY_EVENTS.LOAD_BS_CREDENTIALS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAuthenticate() {
    const user = username.trim();
    const key = accessKey.trim();
    if (!user || !key) return;

    setValidationError('');
    setSaveError('');
    setLoading(true);

    try {
      const token = btoa(`${user}:${key}`);
      const res = await fetch('https://percy.io/api/v1/user', {
        headers: {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        emit(PERCY_EVENTS.SAVE_BS_CREDENTIALS, { username: user, accessKey: key });
      } else {
        setValidationError('Username/Access Key is incorrect');
      }
    } catch {
      setValidationError('Failed to reach Percy. Check your network connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container>
      <Title>Connect to BrowserStack</Title>
      <Subtitle>
        Enter your BrowserStack credentials to access Percy visual testing
      </Subtitle>

      <InfoBox>
        <InfoTitle>
          <InfoIcon />
          Where to find your credentials
        </InfoTitle>
        <InfoText>
          You can find your Username and Access Key in your profile page.
        </InfoText>
        <InfoLink
          href="https://www.browserstack.com/accounts/profile"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLinkIcon />
          Go to profile page
        </InfoLink>
      </InfoBox>

      <div>
        <FieldLabel htmlFor="bs-username">Username</FieldLabel>
        <InputWrapper>
          <Input
            id="bs-username"
            type={showUsername ? 'text' : 'password'}
            value={username}
            onChange={e => { setUsername(e.target.value); setSaveError(''); }}
            autoComplete="username"
          />
          <EyeButton
            type="button"
            onClick={() => setShowUsername(v => !v)}
            aria-label={showUsername ? 'Hide username' : 'Show username'}
          >
            {showUsername ? <EyeOpen /> : <EyeOff />}
          </EyeButton>
        </InputWrapper>
      </div>

      <div>
        <FieldLabel htmlFor="bs-access-key">Access Key</FieldLabel>
        <InputWrapper>
          <Input
            id="bs-access-key"
            type={showAccessKey ? 'text' : 'password'}
            value={accessKey}
            onChange={e => { setAccessKey(e.target.value); setSaveError(''); setValidationError(''); }}
            autoComplete="current-password"
          />
          <EyeButton
            type="button"
            onClick={() => setShowAccessKey(v => !v)}
            aria-label={showAccessKey ? 'Hide access key' : 'Show access key'}
          >
            {showAccessKey ? <EyeOpen /> : <EyeOff />}
          </EyeButton>
        </InputWrapper>
        {validationError && <ErrorText>{validationError}</ErrorText>}
      </div>

      <AuthButton
        type="button"
        onClick={handleAuthenticate}
        disabled={loading || !username.trim() || !accessKey.trim()}
      >
        {loading ? 'Verifying…' : 'Authenticate'}
      </AuthButton>

      {saveError && (
        <FeedbackBadge error>✕ {saveError}</FeedbackBadge>
      )}
    </Container>
  );
}
