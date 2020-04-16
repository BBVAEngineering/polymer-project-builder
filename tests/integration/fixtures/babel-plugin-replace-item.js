module.exports = function() {
	return {
		visitor: {
			Identifier: {
				exit(path) {
					if (path.node.name === 'item') {
						path.node.name = 'BABEL_TEST';
					}
				}
			}
		}
	};
};
