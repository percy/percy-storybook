import { styled } from 'storybook/theming';

export const Container = styled.div`width: 100%;`;

export const Title = styled.h2`
  margin: 0 0 8px; font-size: 24px; font-weight: 700;
  text-align: center; color: ${p => p.theme.color.defaultText};
`;

export const Subtitle = styled.p`
  margin: 0 0 28px; font-size: 14px; text-align: center;
  color: ${p => p.theme.color.mediumdark}; line-height: 1.5;
`;

export const SearchRow = styled.div`
  display: flex; align-items: flex-start; gap: 8px;
`;

export const SearchInputWrapper = styled.div`
  flex: 1; min-width: 0; position: relative;
  display: flex; align-items: center; height: 48px; padding: 0 12px;
  border: 1px solid ${p => p.theme.appBorderColor}; border-radius: 8px;
  background: ${p => p.theme.background.content};
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08); gap: 8px;
`;

export const SearchInput = styled.input`
  flex: 1; min-width: 0; border: none; outline: none;
  background: transparent; font-size: 14px;
  color: ${p => p.theme.color.defaultText};
  &::placeholder { color: ${p => p.theme.color.mediumdark}; }
`;

export const ClearButton = styled.button`
  all: unset; cursor: pointer; display: flex; align-items: center;
  padding: 4px 6px; border-radius: 4px;
  color: ${p => p.theme.color.mediumdark};
  &:hover { color: ${p => p.theme.color.defaultText}; background: ${p => p.theme.background.hoverable}; }
`;

export const ResultsList = styled.div`
  margin-top: 8px; border: 1px solid ${p => p.theme.appBorderColor};
  border-radius: 8px; background: ${p => p.theme.background.content};
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08);
  max-height: 320px; overflow-y: auto;
`;

export const ResultItem = styled.div`
  padding: 10px 16px; cursor: pointer;
  border-bottom: 1px solid ${p => p.theme.appBorderColor};
  border-left: 3px solid ${p => p.selected ? p.theme.color.secondary : 'transparent'};
  background: ${p => p.selected ? (p.theme.base === 'dark' ? 'rgba(30, 167, 253, 0.1)' : 'rgba(30, 167, 253, 0.06)') : 'transparent'};
  &:last-child { border-bottom: none; }
  &:hover { background: ${p => p.selected ? (p.theme.base === 'dark' ? 'rgba(30, 167, 253, 0.1)' : 'rgba(30, 167, 253, 0.06)') : p.theme.background.hoverable}; }
`;

export const ProjectName = styled.div`font-weight: 600; font-size: 14px;`;

export const ProjectMeta = styled.div`
  font-size: 12px; color: ${p => p.theme.color.mediumdark}; margin-top: 2px;
`;

export const Divider = styled.div`
  display: flex; align-items: center; gap: 16px;
  margin: 20px 0; color: ${p => p.theme.color.mediumdark}; font-size: 13px;
  &::before, &::after {
    content: ''; flex: 1; height: 1px;
    background: ${p => p.theme.appBorderColor};
  }
`;

export const CreateLink = styled.div`
  padding: 10px 16px; cursor: pointer; display: flex;
  align-items: center; justify-content: space-between;
  border-top: 1px solid ${p => p.theme.appBorderColor};
  color: ${p => p.theme.color.secondary}; font-size: 14px; font-weight: 600;
  &:hover { background: ${p => p.theme.background.hoverable}; }
`;

export const LoadingRow = styled.div`
  padding: 12px 16px; text-align: center; font-size: 13px;
  color: ${p => p.theme.color.mediumdark};
  display: flex; align-items: center; justify-content: center; gap: 6px;
`;
