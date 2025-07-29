import { snapshotSchema } from '@percy/core/config';

export const storybookSchema = {
  $id: '/storybook',
  $ref: '/storybook#/$defs/params',
  $defs: {
    enableJavaScript: {
      isTrue: {
        required: ['enableJavaScript'],
        properties: { enableJavaScript: { const: true } }
      },
      isNotFalse: {
        not: {
          required: ['enableJavaScript'],
          properties: { enableJavaScript: { const: false } }
        }
      },
      disallowedProperties: {
        disallowed: Object.keys(snapshotSchema.$defs.precapture.properties),
        errors: { disallowed: 'not used with JavaScript enabled' }
      }
    },
    common: {
      type: 'object',
      allOf: [
        { $ref: '/snapshot#/$defs/filter' },
        { $ref: '/snapshot#/$defs/precapture' },
        {
          if: { $ref: '/storybook#/$defs/enableJavaScript/isTrue' },
          then: { $ref: '/storybook#/$defs/enableJavaScript/disallowedProperties' }
        }
      ],
      properties: {
        args: {
          type: 'object',
          normalize: false
        },
        globals: {
          type: 'object',
          normalize: false
        },
        queryParams: {
          type: 'object',
          normalize: false
        },
        responsiveSnapshotCapture: {
          type: 'boolean',
          default: false
        },
        widths: {
          type: 'array',
          items: {
            type: 'integer',
            minimum: 1
          },
          default: []
        }
      }
    },
    additionalSnapshots: {
      options: {
        type: 'object',
        unevaluatedProperties: false,
        allOf: [
          { $ref: '/snapshot#/$defs/common' },
          { $ref: '/storybook#/$defs/common' }
        ],
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
      },
      property: {
        properties: {
          additionalSnapshots: {
            type: 'array',
            items: {
              $ref: '/storybook#/$defs/additionalSnapshots/options'
            }
          }
        }
      },
      enabledJavaScript: {
        properties: {
          additionalSnapshots: {
            type: 'array',
            items: {
              $ref: '/storybook#/$defs/additionalSnapshots/options',
              if: { $ref: '/storybook#/$defs/enableJavaScript/isNotFalse' },
              then: { $ref: '/storybook#/$defs/enableJavaScript/disallowedProperties' }
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
        { $ref: '/storybook#/$defs/common' },
        { $ref: '/storybook#/$defs/additionalSnapshots/property' },
        {
          if: { $ref: '/storybook#/$defs/enableJavaScript/isTrue' },
          then: { $ref: '/storybook#/$defs/additionalSnapshots/enabledJavaScript' }
        }
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
    unevaluatedProperties: false,
    allOf: [
      { $ref: '/storybook#/$defs/common' },
      { $ref: '/storybook#/$defs/additionalSnapshots/property' },
      {
        if: { $ref: '/storybook#/$defs/enableJavaScript/isTrue' },
        then: { $ref: '/storybook#/$defs/additionalSnapshots/enabledJavaScript' }
      }
    ]
  },
  $config: schema => ({
    allOf: [...(schema.allOf ?? []), {
      if: {
        required: ['snapshot'],
        properties: {
          snapshot: {
            required: ['enableJavaScript'],
            properties: { enableJavaScript: { const: true } }
          }
        }
      },
      then: {
        properties: {
          storybook: {
            allOf: [
              { $ref: '/storybook#/$defs/enableJavaScript/disallowedProperties' },
              { $ref: '/storybook#/$defs/additionalSnapshots/enabledJavaScript' }
            ]
          }
        }
      }
    }]
  })
};
