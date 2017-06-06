import {
	Status,
	safeJS,
	hasPendingException,
	handles,
	setResult,
} from '../utils';

var objToString = Object.prototype.toString;

function checkTag(result, value, tag) {
	return safeJS(
		result,
		false,
		function(value) {
			// can fail on a revoked Proxy
			// https://tc39.github.io/ecma262/#sec-object.prototype.tostring
			return objToString.call(value) === '[object ' + tag + ']';
		},
		value
	);
}

export function napi_is_error(env, value, result) {
	return checkTag(result, value, 'Error');
}

export function napi_instanceof(env, value, Ctor, result) {
	return safeJS(
		result,
		false,
		function(value, Ctor) {
			// can fail on non-objects and more
			// https://tc39.github.io/ecma262/#sec-instanceofoperator
			return value instanceof Ctor;
		},
		value,
		Ctor
	);
}

export function napi_is_array(env, value, result) {
	// can fail on a revoked Proxy
	// https://tc39.github.io/ecma262/#sec-isarray
	return safeJS(result, false, Array.isArray, value);
}

export function napi_is_arraybuffer(env, value, result) {
	return checkTag(result, value, 'ArrayBuffer');
}

export function napi_is_typedarray(env, value, result) {
	if (hasPendingException()) {
		return Status.PendingException;
	}
	// can't fail, only checks if an internal slot is present
	// https://tc39.github.io/ecma262/#sec-arraybuffer.isview
	return setResult(result, ArrayBuffer.isView(handles[value]));
}

var ValueType = {
	undefined: 0,
	null: 1,
	boolean: 2,
	number: 3,
	string: 4,
	symbol: 5,
	object: 6,
	function: 7,
	external: 8,
};

export function napi_typeof(env, value, result) {
	value = handles[value];
	var t = typeof value;
	if (t === 'object' && value === null) {
		t = 'null';
	}
	return setResult(result, ValueType[t]);
}

export function napi_strict_equals(env, lhs, rhs, result) {
	if (hasPendingException()) {
		return Status.PendingException;
	}
	// can't fail
	// https://tc39.github.io/ecma262/#sec-strict-equality-comparison
	return setResult(result, handles[lhs] === handles[rhs]);
}
