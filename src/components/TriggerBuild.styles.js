import { styled } from 'storybook/theming';

export const Container = styled.div`
  width: 100%;
  text-align: center;
`;

export const ProjectTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: ${p => p.theme.color.defaultText};
`;

export const Description = styled.p`
  margin: 0 0 32px;
  font-size: 14px;
  color: ${p => p.theme.color.mediumdark};
  line-height: 1.5;
`;

export const ScopeSection = styled.div`
  text-align: left;
  margin-bottom: 24px;
`;

export const ScopeLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.color.defaultText};
  margin-bottom: 12px;
`;

export const RadioCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid ${p => p.selected ? '#2563eb' : p.theme.appBorderColor};
  border-radius: 8px;
  cursor: pointer;
  background: ${p => p.selected ? '#eff6ff' : p.theme.background.content};
  transition: border-color 0.15s, background 0.15s;
  margin-bottom: 8px;
  &:last-of-type { margin-bottom: 0; }
  &:hover { border-color: ${p => p.selected ? '#2563eb' : '#93c5fd'}; }
`;

export const RadioDot = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid ${p => p.selected ? '#2563eb' : p.theme.appBorderColor};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  transition: border-color 0.15s;
  &::after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.selected ? '#2563eb' : 'transparent'};
    transition: background 0.15s;
  }
`;

export const RadioContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const RadioLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.color.defaultText};
`;

export const RadioDesc = styled.div`
  font-size: 13px;
  color: ${p => p.theme.color.mediumdark};
`;

export const RunButton = styled.button`
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  box-sizing: border-box;
  background: #2563eb;
  transition: background 0.15s;
  &:hover { background: #1d4ed8; }
`;
