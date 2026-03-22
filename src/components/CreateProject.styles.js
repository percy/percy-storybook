import { styled } from 'storybook/theming';

export const Container = styled.div`width: 100%;`;

export const BackLink = styled.button`
  all: unset; cursor: pointer;
  display: flex; align-items: center; gap: 4px;
  font-size: 13px; color: ${p => p.theme.color.mediumdark};
  margin-bottom: 24px;
  &:hover { color: ${p => p.theme.color.defaultText}; }
`;

export const Title = styled.h2`
  margin: 0 0 16px; font-size: 24px; font-weight: 700;
  text-align: center; color: ${p => p.theme.color.defaultText};
`;

export const AlertWrapper = styled.div`margin-bottom: 24px;`;

export const FieldWrapper = styled.div`margin-bottom: 20px;`;
