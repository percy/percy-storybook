export const schema = {
  storybook: {
    type: 'object',
    additionalProperties: false,
    properties: {
      include: {
        anyOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ]
      },
      exclude: {
        anyOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ]
      }
    }
  }
};
