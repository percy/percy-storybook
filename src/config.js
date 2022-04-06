export const storybookSchema = {
  $id: '/storybook',
  $ref: '/storybook#/$defs/params',
  $defs: {
    common: {
      type: 'object',
      $ref: '/snapshot#/$defs/filter',
      properties: {
        args: {
          type: 'object',
          normalize: false
        },
        queryParams: {
          type: 'object',
          normalize: false
        },
        waitForSelector: {
          $ref: '/snapshot#/$defs/precapture/properties/waitForSelector'
        },
        waitForTimeout: {
          $ref: '/snapshot#/$defs/precapture/properties/waitForTimeout'
        }
      }
    },
    options: {
      type: 'object',
      $ref: '/storybook#/$defs/common',
      properties: {
        additionalSnapshots: {
          type: 'array',
          items: {
            type: 'object',
            $ref: '/storybook#/$defs/common',
            unevaluatedProperties: false,
            oneOf: [{
              required: ['name']
            }, {
              anyOf: [
                { required: ['prefix'] },
                { required: ['suffix'] }
              ]
            }],
            properties: {
              name: { type: 'string' },
              prefix: { type: 'string' },
              suffix: { type: 'string' }
            },
            errors: {
              oneOf: ({ params }) => params.passingSchemas
                ? 'prefix & suffix are ignored when a name is provided'
                : 'missing required name, prefix, or suffix'
            }
          }
        }
      }
    },
    params: {
      type: 'object',
      unevaluatedProperties: false,
      allOf: [
        { $ref: '/snapshot#/$defs/common' },
        { $ref: '/storybook#/$defs/options' }
      ],
      properties: {
        name: { type: 'string' },
        skip: { type: 'boolean' }
      }
    }
  }
};

export const configSchema = {
  storybook: {
    type: 'object',
    $ref: '/storybook#/$defs/options',
    unevaluatedProperties: false
  }
};
