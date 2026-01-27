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
          default: [375, 1280]
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
        id: {
          type: 'string',
          description: 'Storybook story or doc id (e.g. component--story or component--docs); used for URL'
        },
        name: { type: 'string' },
        skip: { type: 'boolean' },
        type: { type: 'string', enum: ['story', 'docs'] },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Storybook entry tags (e.g. autodocs); used to distinguish doc types'
        }
      }
    },
    commonDocRule: {
      type: 'object',
      allOf: [
        { $ref: '/snapshot#/$defs/precapture' },
        {
          if: { $ref: '/storybook#/$defs/enableJavaScript/isTrue' },
          then: { $ref: '/storybook#/$defs/enableJavaScript/disallowedProperties' }
        }
      ],
      properties: {
        args: { type: 'object', normalize: false },
        globals: { type: 'object', normalize: false },
        queryParams: { type: 'object', normalize: false },
        responsiveSnapshotCapture: { type: 'boolean', default: false },
        widths: {
          type: 'array',
          items: { type: 'integer', minimum: 1 },
          default: [375, 1280]
        }
      }
    },
    docRule: {
      type: 'object',
      unevaluatedProperties: false,
      allOf: [
        { $ref: '/storybook#/$defs/commonDocRule' },
        { $ref: '/storybook#/$defs/additionalSnapshots/property' },
        {
          if: { $ref: '/storybook#/$defs/enableJavaScript/isTrue' },
          then: { $ref: '/storybook#/$defs/enableJavaScript/disallowedProperties' }
        }
      ],
      required: ['match'],
      properties: {
        match: {
          description: 'Doc id or name(s). String or array. Exact match, or glob: * (any chars), ? (one char). Doc matches if it matches any entry.',
          oneOf: [
            { type: 'string', minLength: 1 },
            { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 1 }
          ]
        },
        capture: {
          type: 'boolean',
          description: 'When captureDocs/captureAutodocs is true: set false to exclude. When false: set true to include.'
        }
      }
    },
    docsConfig: {
      type: 'object',
      unevaluatedProperties: false,
      properties: {
        mdx: {
          type: 'object',
          unevaluatedProperties: false,
          properties: {
            rules: {
              type: 'array',
              items: { $ref: '/storybook#/$defs/docRule' }
            }
          }
        },
        autodocs: {
          type: 'object',
          unevaluatedProperties: false,
          properties: {
            rules: {
              type: 'array',
              items: { $ref: '/storybook#/$defs/docRule' }
            }
          }
        }
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
      { $ref: '/storybook#/$defs/docsConfig' },
      {
        if: { $ref: '/storybook#/$defs/enableJavaScript/isTrue' },
        then: { $ref: '/storybook#/$defs/additionalSnapshots/enabledJavaScript' }
      }
    ],
    properties: {
      captureDocs: {
        type: 'boolean',
        description: 'Capture all MDX docs when true'
      },
      captureAutodocs: {
        type: 'boolean',
        description: 'Capture all autodocs when true'
      }
    }
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
