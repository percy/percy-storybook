function reactVersion() {
  if (process.env['npm_package_dependencies_react']) {
    return `react/${process.env['npm_package_dependencies_react']}`;
  } else if (process.env.npm_package_dependencies_react) {
    return `react/${process.env.npm_package_dependencies_react}`;
  } else if (process.env['npm_package_devDependencies_react']) {
    return `react/${process.env['npm_package_devDependencies_react']}`;
  } else if (process.env.npm_package_devDependencies_react) {
    return `react/${process.env.npm_package_devDependencies_react}`;
  }
}

function angularVersion() {
  if (process.env['npm_package_dependencies_@angular/core']) {
    return `angular/${process.env['npm_package_dependencies_@angular/core']}`;
  } else if (process.env.npm_package_dependencies__angular_core) {
    return `angular/${process.env.npm_package_dependencies__angular_core}`;
  } else if (process.env['npm_package_devDependencies_@angular/core']) {
    return `angular/${process.env['npm_package_devDependencies_@angular/core']}`;
  } else if (process.env.npm_package_devDependencies__angular_core) {
    return `angular/${process.env.npm_package_devDependencies__angular_core}`;
  }
}

function vueVersion() {
  if (process.env['npm_package_dependencies_vue']) {
    return `vue/${process.env['npm_package_dependencies_vue']}`;
  } else if (process.env.npm_package_dependencies_vue) {
    return `vue/${process.env.npm_package_dependencies_vue}`;
  } else if (process.env['npm_package_devDependencies_vue']) {
    return `vue/${process.env['npm_package_devDependencies_vue']}`;
  } else if (process.env.npm_package_devDependencies_vue) {
    return `vue/${process.env.npm_package_devDependencies_vue}`;
  }
}

function emberVersion() {
  if (process.env['npm_package_dependencies_ember-source']) {
    return `ember/${process.env['npm_package_dependencies_ember-source']}`;
  } else if (process.env.npm_package_dependencies_ember_source) {
    return `ember/${process.env.npm_package_dependencies_ember_source}`;
  } else if (process.env['npm_package_devDependencies_ember-source']) {
    return `ember/${process.env['npm_package_devDependencies_ember-source']}`;
  } else if (process.env.npm_package_devDependencies_ember_source) {
    return `ember/${process.env.npm_package_devDependencies_ember_source}`;
  }
}

export default function frameworkVersion() {
  return reactVersion() || angularVersion() || vueVersion() || emberVersion() || 'unknown';
}
