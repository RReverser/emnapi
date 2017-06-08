var StatusMsgs = [
	'Ok',
	'Invalid argument',
	'Object expected',
	'String expected',
	'Name expected',
	'Function expected',
	'Number expected',
	'Boolean expected',
	'Array expected',
	'Generic failure',
	'Pending exception',
	'Cancelled',
];

export var lastError = 0;

export var Status = StatusMsgs.reduce(function(result, key, i) {
	key = key.replace(/ ([a-z])/, function(_, s) {
		return s.toUpperCase();
	});
	result[key] = function() {
		return (lastError = i);
	};
	return result;
}, {});

/*
typedef struct {
  const char* error_message;
  void* engine_reserved;
  uint32_t engine_error_code;
  napi_status error_code;
} napi_extended_error_info;
*/
export var ExtendedErrorInfo = StatusMsgs.map(function(msg, i) {
	/* eslint-disable no-undef */
	// allocate space
	var ptr = allocate(16, 'i8', ALLOC_STATIC);
	HEAPU32[ptr >> 2] = allocate(intArrayFromString(msg), 'i8', ALLOC_STATIC);
	HEAPU32[(ptr >> 2) + 3] = i;
	return ptr;
});

export var SENTINEL = typeof Symbol !== 'undefined'
	? Symbol('napi.sentinel')
	: { sentinel: true };

var pendingException = SENTINEL;

export function hasPendingException() {
	return pendingException !== SENTINEL;
}

export function caughtException(exception) {
	pendingException = exception;
	return Status.PendingException();
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
export var boolHandle = 3;
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
	return Status.Ok();
}

export function setValue(result, value) {
	return setResult(result, createValue(value));
}

export function safeJS(result, toValue, callback /*, ...values*/) {
	if (hasPendingException()) {
		return Status.PendingException();
	}
	var resultValue;
	var inputs = [];
	for (var i = 3; i < arguments.length; i++) {
		inputs.push(handles[arguments[i]]);
	}
	try {
		resultValue = callback.apply(null, inputs);
	} catch (exception) {
		return caughtException(exception);
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
