export var Status = {
	Ok: 0,
	InvalidArg: 1,
	ObjectExpected: 2,
	StringExpected: 3,
	NameExpected: 4,
	FunctionExpected: 5,
	NumberExpected: 6,
	BooleanExpected: 7,
	ArrayExpected: 8,
	GenericFailure: 9,
	PendingException: 10,
	Cancelled: 11,
};

export var SENTINEL = typeof Symbol !== 'undefined'
	? Symbol('napi.sentinel')
	: { sentinel: true };

var pendingException = SENTINEL;

export function hasPendingException() {
	return pendingException !== SENTINEL;
}

export function setPendingException(exception) {
	if (hasPendingException()) {
		return Status.PendingException;
	}
	pendingException = exception;
	return Status.Ok;
}

export function extractPendingException() {
	var exception = pendingException;
	pendingException = SENTINEL;
	return exception;
}

var nativeDepth = 0;

export var handles = [
	SENTINEL,
	undefined,
	null,
	false,
	true,
	typeof global !== 'undefined' ? global : self,
];

export var undefinedHandle = 1;
export var nullHandle = 2;
export var boolHandle = 4;
export var globalHandle = 5;

export function createScope() {
	nativeDepth++;
	return handles.length;
}

export function leaveScope(scope) {
	handles.length = scope;
	if (--nativeDepth === 0 && hasPendingException()) {
		// exited topmost native method
		throw extractPendingException();
	}
}

export function withNewScope(callback) {
	var scope = createScope();
	var result = callback();
	leaveScope(scope);
	return result;
}

export function createValue(value) {
	var index = handles.indexOf(value);
	if (index === -1) {
		index = handles.push(value) - 1;
	}
	return index;
}

export function setResult(result, value) {
	HEAPU32[result >> 2] = value;
	return Status.Ok;
}

export function setValue(result, value) {
	return setResult(result, createValue(value));
}

export function safeJS(result, toValue, callback /*, ...values*/) {
	if (hasPendingException()) {
		return Status.PendingException;
	}
	var resultValue;
	var inputs = [];
	for (var i = 3; i < arguments.length; i++) {
		inputs.push(handles[arguments[i]]);
	}
	try {
		resultValue = callback.apply(null, inputs);
	} catch (exception) {
		setPendingException(exception);
		return Status.PendingException;
	}
	if (toValue) {
		resultValue = createValue(resultValue);
	}
	return setResult(result, resultValue);
}

export function wrapCallback(ptr, data) {
	var func = FUNCTION_TABLE_iii[ptr];
	return function() {
		var cbInfo = {
			this: this,
			args: Array.prototype.slice.call(arguments),
			data: data,
		};
		return withNewScope(function() {
			return handles[func(0, createValue(cbInfo))];
		});
	};
}
