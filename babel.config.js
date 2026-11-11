const path = require('node:path');

const SATELLITE_JS = `${path.sep}node_modules${path.sep}satellite.js${path.sep}dist${path.sep}`;

// The pass worker runs satellite.js on a worklet runtime, so its files need the worklet directive the library doesn't ship with.
function satelliteJsWorklets({ types }) {
  return {
    visitor: {
      Program(program, state) {
        const isSatelliteJs = state.filename?.includes(SATELLITE_JS);
        const hasDirective = program.node.directives.some(({ value }) => value.value === 'worklet');
        if (isSatelliteJs && !hasDirective) {
          program.unshiftContainer(
            'directives',
            types.directive(types.directiveLiteral('worklet')),
          );
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }], satelliteJsWorklets],
  };
};
