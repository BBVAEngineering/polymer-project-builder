'use strict';

const fs = require('fs-extra');
const PolymerProjectBuilder = require('../../../lib/index');
const assert = require('yeoman-assert');

const CONFIG_MOCKS = {
	basic: require('../fixtures/basic.js'),
	allOptions: require('../fixtures/all-options.js'),
	customBabel: require('../fixtures/custom-babel-options.js')
};

const TEST_TIMEOUT = 25000;

jest.setTimeout(TEST_TIMEOUT);

describe('PolymerProjectBuilder', () => {
	beforeAll(() => {
		process.chdir('tests/integration/fixtures');
		fs.removeSync('dist');
	});

	describe('With basic config file', () => {
		beforeAll(async() => {
			const instance = new PolymerProjectBuilder(CONFIG_MOCKS.basic);

			await instance.build();
		});

		afterAll(() => {
			fs.removeSync('dist');
		});

		it('generates a bundle with the entrypoint name in the specified dest', () => {
			assert.file('dist/assets/elements.html');
		});

		it('does not generate a separate file with the bundled JavaScript', () => {
			assert.noFile('dist/assets/elements.js');
		});
	});

	describe('With all options enabled', () => {
		beforeAll(async() => {
			const instance = new PolymerProjectBuilder(CONFIG_MOCKS.allOptions);

			await instance.build();
		});

		afterAll(() => {
			fs.removeSync('dist');
		});

		it('generates a bundle with the file specified in bundleFileName', () => {
			assert.file('dist/assets/bundled.html');
		});

		it('generates a separate file with the bundled JavaScript', () => {
			assert.file('dist/assets/bundled.js');
		});
	});

	describe('With CSP and custom Babel config', () => {
		beforeAll(async() => {
			const instance = new PolymerProjectBuilder(CONFIG_MOCKS.customBabel);

			await instance.build();
		});

		afterAll(() => {
			fs.removeSync('dist');
		});

		it('applies the Babel config to JavaScript', () => {
			assert.fileContent('dist/assets/bundled.js', 'BABEL_TEST');
		});
	});
});
