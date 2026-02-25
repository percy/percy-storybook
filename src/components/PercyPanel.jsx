import React from 'react';
import { styled } from 'storybook/theming';

/* ─── Styled components ─────────────────────────────────────────────────── */

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 48px 32px;
  height: 100%;
  background: ${props => props.theme.background.app};
`;

const Logo = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
`;

const Heading = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.color.defaultText};
  letter-spacing: -0.5px;
`;

const Tagline = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${props => props.theme.color.mediumdark};
  text-align: center;
  max-width: 320px;
  line-height: 1.6;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #7b61ff22;
  color: #7b61ff;
  border: 1px solid #7b61ff44;
`;

/* ─── Component ─────────────────────────────────────────────────────────── */

const PERCY_LOGO = 'https://avatars.githubusercontent.com/u/12260884';

export function PercyPanel({ active }) {
  if (!active) return null;
  return (
    <Wrapper>
      <Logo
        src={PERCY_LOGO}
        alt="Percy logo"
      />
      <div style={{ textAlign: 'center' }}>
        <Heading>Percy</Heading>
        <Badge style={{ marginTop: 8 }}>Visual Testing</Badge>
      </div>
      <Tagline>
        Catch visual bugs automatically. Percy captures screenshots and
        compares them across your builds.
      </Tagline>
    </Wrapper>
  );
}
