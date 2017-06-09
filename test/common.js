const mustCallChecks = [];

module.exports = {
	buildType: 'debug',

	mustCall(fn = () => {}, expected = 1) {
		const context = {
			expected,
			actual: 0,
			stack: new Error().stack,
			name: fn.name || '<anonymous>',
		};

		mustCallChecks.push(context);

		return function() {
			context.actual++;
			return fn.apply(this, arguments);
		};
	},

	runCallChecks() {
		const failed = mustCallChecks.filter(context => {
			return context.actual !== context.expected;
		});

		mustCallChecks.length = 0;

		failed.forEach(context => {
			const message = `Mismatched ${context.name} function calls. Expected ${context.expected}, actual ${context.actual}.`;
			const e = new Error(message);
			const stack = context.stack.split('\n').slice(2);
			stack.unshift(message);
			e.stack = stack.join('\n');
			throw e;
		});
	},
};
