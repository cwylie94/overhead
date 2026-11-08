const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('sql');

// satellite.js only loads these WebAssembly builds from opt-in APIs the app never calls, and they import Node built-ins that break release bundles.
const UNUSED_SATELLITE_WASM = new Set(['#wasm-single-thread', '#wasm-multi-thread']);

config.resolver.resolveRequest = (context, moduleName, platform) =>
  UNUSED_SATELLITE_WASM.has(moduleName)
    ? { type: 'empty' }
    : context.resolveRequest(context, moduleName, platform);

module.exports = config;
