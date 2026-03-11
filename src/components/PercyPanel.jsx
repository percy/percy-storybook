import React, { useState } from 'react';
import { styled } from 'storybook/theming';
import { BrowserStackConnect } from './BrowserStackConnect';
import { ProjectSetup } from './ProjectSetup';

/* ─── Styled components ─────────────────────────────────────────────────── */

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: ${props => props.theme.background.app};
`;

const ScrollBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px;
  box-sizing: border-box;
`;

/* ─── Component ─────────────────────────────────────────────────────────── */

export function PercyPanel({ active }) {
  const [authenticated, setAuthenticated] = useState(false);

  if (!active) return null;
  return (
    <Wrapper>
      <ScrollBody>
        {authenticated
          ? <ProjectSetup />
          : <BrowserStackConnect onAuthenticated={() => setAuthenticated(true)} />}
      </ScrollBody>
    </Wrapper>
  );
}
