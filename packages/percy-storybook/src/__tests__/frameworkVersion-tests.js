import frameworkVersion from '../frameworkVersion';

let existingReactVersion;
let existingAngularVersion;
let existingEmberVersion;
let existingVueVersion;

beforeEach(() => {
  existingReactVersion = process.env.npm_package_dependencies_react;
  delete process.env.npm_package_dependencies_react;

  existingAngularVersion = process.env.npm_package_dependencies__angular_core;
  delete process.env.npm_package_dependencies__angular_core;

  existingEmberVersion = process.env.npm_package_dependencies_ember_source;
  delete process.env.npm_package_dependencies_ember_source;

  existingVueVersion = process.env.npm_package_dependencies_vue;
  delete process.env.npm_package_dependencies_vue;
});

afterEach(() => {
  process.env.npm_package_dependencies_react = existingReactVersion;
  process.env.npm_package_dependencies__angular_core = existingAngularVersion;
  process.env.npm_package_dependencies_ember_source = existingEmberVersion;
  process.env.npm_package_dependencies_vue = existingVueVersion;
});

it('returns unknown when framework is not found', () => {
  expect(frameworkVersion()).toEqual('unknown');
});

it('returns the expected react version', () => {
  process.env.npm_package_dependencies_react = '1.15';
  expect(frameworkVersion()).toEqual('react/1.15');
});

it('returns the expected angular version', () => {
  process.env.npm_package_dependencies__angular_core = '1.15';
  expect(frameworkVersion()).toEqual('angular/1.15');
});

it('returns the expected ember version', () => {
  process.env.npm_package_dependencies_ember_source = '1.15';
  expect(frameworkVersion()).toEqual('ember/1.15');
});

it('returns the expected vue version', () => {
  process.env.npm_package_dependencies_vue = '1.15';
  expect(frameworkVersion()).toEqual('vue/1.15');
});
