'use strict';

const { PolymerProject, HtmlSplitter, getOptimizeStreams } = require('polymer-build');
const mergeStream = require('merge-stream');
const path = require('path');
const fs = require('fs-extra');
const vinyl = require('vinyl-fs');
const { log } = require('./logger');
const splitter = new HtmlSplitter();
const crisper = require('crisper');
const HTMLPostCSS = require('html-postcss');
const autoprefixer = require('autoprefixer');
const htmlAutoprefixer = (config) => new HTMLPostCSS([autoprefixer(config)]);
const babel = require('@babel/core');

function pipeStreams(streams) {
	return Array.prototype.concat.apply([], streams)
		.reduce((a, b) => a.pipe(b));
}

function waitFor(stream) {
	return new Promise(((resolve, reject) => {
		stream.on('end', resolve);
		stream.on('error', reject);
	}));
}

module.exports = class PolymerProjectBuilder {
	constructor(options) {
		this.options = options;
		this.buildConfig = this.options.build;
		this.outputFile = this.options.bundleFileName || this.options.entrypoint;
		this.bundlePath = path.join(this.options.dest, this.outputFile);

		this.setup();
	}

	get bundleContents() {
		return fs.readFileSync(this.bundlePath, 'utf8');
	}

	get customBabelConfig() {
		return this.buildConfig.js.babel;
	}

	setup() {
		this.project = new PolymerProject(this.options);

		this.buildOptions = Object.assign({}, this.buildConfig, {
			bundle: true,
			name: 'custom-build',
			js: Object.assign({}, this.buildConfig.js, {
				moduleResolution: this.project.config.moduleResolution
			}),
			entrypointPath: this.project.config.entrypoint,
			rootDir: this.project.config.root
		});

		if (this.customBabelConfig && this.buildConfig.csp) {
			this.buildOptions.js.compile = false;
		}
	}

	build() {
		let buildStream = mergeStream(
			this.project.sources(),
			this.project.dependencies()
		);

		buildStream.once('data', () => {
			log('Building Polymer project');
		});
		buildStream.on('error', this._logError);
		buildStream = buildStream.pipe(this.project.bundler({
			stripComments: true,
			rewriteUrlsInTemplates: false
		}));

		buildStream = pipeStreams([
			buildStream,
			splitter.split(),
			getOptimizeStreams(this.buildOptions),
			splitter.rejoin()
		]);

		buildStream = buildStream.pipe(
			vinyl.dest(this.options.dest)
		);

		return waitFor(buildStream)
			.then(() => this.postProcess());
	}

	postProcess() {
		this.renameBundle();
		this.autoprefixStyles();
		this.splitHtmlAndJs();
	}

	renameBundle() {
		log(`Writing ${this.bundlePath}`);

		if (this.options.bundleFileName) {
			const oldPath = path.join(this.options.dest, this.options.entrypoint);

			fs.renameSync(oldPath, this.bundlePath);
		}
	}

	autoprefixStyles() {
		const cssOptions = this.buildConfig.css || {};
		const autoprefixerConfig = cssOptions.autoprefixer;

		if (autoprefixerConfig) {
			const result = htmlAutoprefixer(autoprefixerConfig).process(this.bundleContents);

			log('Autoprefixing styles');

			fs.writeFileSync(this.bundlePath, result);
		}
	}

	splitHtmlAndJs() {
		if (this.buildConfig.csp) {
			const jsFileName = this.outputFile.replace(path.extname(this.outputFile), '.js');

			const { html, js } = crisper({
				jsFileName,
				source: this.bundleContents,
				scriptInHead: false
			});

			log('Splitting HTML and JavaScript');

			const script = this.customBabelConfig ? babel.transformSync(js, this.customBabelConfig).code : js;

			fs.writeFileSync(this.bundlePath, html);
			fs.writeFileSync(path.join(this.options.dest, jsFileName), script);
		}
	}

	_logError(e) {
		log(`Error Building Polymer project: \n${e}`, 'error');
	}
};
