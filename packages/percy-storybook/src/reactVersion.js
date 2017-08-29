export default function reactVersion() {
  return process.env.npm_package_dependencies_react || 'unknown';
}
