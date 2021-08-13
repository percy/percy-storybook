import PercyConfig from '@percy/config';
import * as CoreConfig from '@percy/core/dist/config';
import * as StorybookConfig from '../config';

export default function() {
  PercyConfig.addSchema(CoreConfig.schemas);
  PercyConfig.addSchema(StorybookConfig.schemas);
}
