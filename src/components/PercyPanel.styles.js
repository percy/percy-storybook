import { styled } from 'storybook/theming';

export const Wrapper = styled.div`
  display: flex; flex-direction: column; height: 100%;
  overflow: hidden; background: ${p => p.theme.background.app};
`;

export const Header = styled.div`
  display: flex; align-items: center; padding: 10px 16px;
  border-bottom: 1px solid ${p => p.theme.appBorderColor};
  background: ${p => p.theme.background.content}; flex-shrink: 0;
`;

export const LogoArea = styled.div`
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600; color: ${p => p.theme.color.defaultText};
`;

export const HeaderActions = styled.div`
  margin-left: auto; display: flex; align-items: center; gap: 8px;
`;

export const ScrollBody = styled.div`
  flex: 1; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center;
  padding: 40px 24px; box-sizing: border-box;
`;

export const Card = styled.div`
  background: ${p => p.theme.background.content};
  border: 1px solid ${p => p.theme.appBorderColor};
  border-radius: 12px; padding: 40px 32px;
  width: 100%; max-width: 600px; box-sizing: border-box;
`;
