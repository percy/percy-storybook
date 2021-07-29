import { snapshotSchema } from '@percy/core/dist/config';

export const configSchema = {
  storybook: {
    type: 'object',
    additionalProperties: false,
    properties: {
      include: {
        anyOf: [
          { oneOf: [{ type: 'string' }, { instanceof: 'RegExp' }] },
          { type: 'array', items: { $ref: '#/properties/include/anyOf/0' } }
        ]
      },
      exclude: {
        anyOf: [
          { oneOf: [{ type: 'string' }, { instanceof: 'RegExp' }] },
          { type: 'array', items: { $ref: '#/properties/exclude/anyOf/0' } }
        ]
      },
      args: {
        type: 'object',
        normalize: false
      },
      queryParams: {
        type: 'object',
        normalize: false
      },
      waitForSelector: {
        $ref: '/snapshot#/properties/waitForSelector'
      },
      waitForTimeout: {
        $ref: '/snapshot#/properties/waitForTimeout'
      },
      additionalSnapshots: {
        type: 'array',
        items: {
          ...snapshotSchema.properties.additionalSnapshots.items,

          properties: {
            args: { $ref: '#/properties/args' },
            queryParams: { $ref: '#/properties/queryParams' },
            waitForSelector: { $ref: '#/properties/waitForSelector' },
            waitForTimeout: { $ref: '#/properties/waitForTimeout' },
            name: { $ref: '/snapshot#/properties/additionalSnapshots/items/properties/name' },
            prefix: { $ref: '/snapshot#/properties/additionalSnapshots/items/properties/prefix' },
            suffix: { $ref: '/snapshot#/properties/additionalSnapshots/items/properties/suffix' }
          }
        }
      }
    }
  }
};

export const storyParamsSchema = {
  $id: '/storybook',
  type: 'object',
  additionalProperties: false,
  disallow: ['url', 'execute'],
  properties: {
    ...snapshotSchema.properties,
    ...configSchema.storybook.properties,

    skip: { type: 'boolean' }
  }
};

export function storyParamsMigration(config, { map, log }) {
  if (config.snapshots) {
    log.deprecated('The `snapshots` option will be ' + (
      'removed in 4.0.0. Use `additionalSnapshots` instead.'));
    map('snapshots', 'additionalSnapshots');
  }
}

export const schemas = [
  configSchema,
  storyParamsSchema
];

export const migrations = [
  ['/storybook', storyParamsMigration]
];
