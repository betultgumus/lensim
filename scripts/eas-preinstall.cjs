if (process.env.LENS_RELEASE_BUILD === '1' || process.env.EAS_BUILD_PROFILE === 'production') require('./check-release.cjs');
