module.exports = {
	entrypoint: 'elements.html',
	bundleFileName: 'bundled.html',
	extraDependencies: [
		'bower_components/webcomponentsjs/**'
	],
	moduleResolution: 'none',
	dest: 'dist/assets',
	build: {
		csp: true,
		js: {
			babel: {
				plugins: [require.resolve('./babel-plugin-replace-item.js')]
			}
		}
	}
};
