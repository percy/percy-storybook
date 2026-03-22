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
