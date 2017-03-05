import getConfigExports from './getConfigExports';
import { configureVirtualEntry } from '../entry';
import requireConfig from './requireConfig';

export default function resolve(configPath) {
    const config = requireConfig(configPath);
    return configureVirtualEntry(getConfigExports(config));
}
