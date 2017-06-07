import {
	Status,
	hasPendingException,
	setResult,
	setValue,
	safeJS,
	handles,
} from '../utils';

export function napi_coerce_to_bool(env, value, result) {
	if (hasPendingException()) {
		return Status.PendingException();
	}
	// can't fail
	// https://tc39.github.io/ecma262/#sec-toboolean
	return setResult(result, !!handles[value]);
}

export function napi_coerce_to_number(env, value, result) {
	// can fail on symbols and objects
	// https://tc39.github.io/ecma262/#sec-tonumber
	return safeJS(result, true, Number, value);
}

export function napi_coerce_to_object(env, value, result) {
	// can't fail when called as regular function
	// https://tc39.github.io/ecma262/#sec-object-constructor
	return setValue(result, Object(value));
}

export function napi_coerce_to_string(env, value, result) {
	// can fail on symbols and objects
	// https://tc39.github.io/ecma262/#sec-tostring
	return safeJS(result, true, String, value);
}
