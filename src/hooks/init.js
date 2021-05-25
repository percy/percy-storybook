import PercyConfig from '@percy/config';
import { schema } from '../config';

export default function() {
  PercyConfig.addSchema(schema);
}
