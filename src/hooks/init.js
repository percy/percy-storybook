import PercyConfig from '@percy/config';
import { schema, migration } from '../config';

export default function() {
  PercyConfig.addSchema(schema);
  PercyConfig.addMigration(migration);
}
