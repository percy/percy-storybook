import getConfigExports from './getConfigExports';
import requireConfig from './requireConfig';

export default function resolve(configPath) {
    const config = requireConfig(configPath);
    return getConfigExports(config);
}
