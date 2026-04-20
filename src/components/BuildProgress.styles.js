import { styled } from 'storybook/theming';

export const ProgressWrapper = styled.div`
  display: flex; flex-direction: column; height: 100%;
  overflow: hidden; background: ${p => p.theme.background.app};
`;

export const ProgressHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid ${p => p.theme.appBorderColor};
  background: ${p => p.theme.background.content}; flex-shrink: 0;
`;

export const ProgressBody = styled.div`
  flex: 1; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center;
  padding: 24px; box-sizing: border-box;
`;
