import {
	Status,
	setResult,
	boolHandle,
	nullHandle,
	undefinedHandle,
	globalHandle,
	handles,
} from '../utils';

export function napi_get_boolean(env, value, result) {
	return setResult(result, boolHandle + value);
}

export function napi_get_null(env, result) {
	return setResult(result, nullHandle);
}

export function napi_get_undefined(env, result) {
	return setResult(result, undefinedHandle);
}

export function napi_get_global(env, result) {
	return setResult(result, globalHandle);
}

export function napi_get_value_double(env, value, result) {
	value = handles[value];
	if (typeof value !== 'number') {
		return Status.NumberExpected();
	}
	HEAPF64[result >> 3] = value;
	return Status.Ok();
}

export function napi_get_value_uint32(env, value, result) {
	value = handles[value];
	if (typeof value !== 'number') {
		return Status.NumberExpected();
	}
	return setResult(result, value);
}

export function napi_get_value_int32(env, value, result) {
	return napi_get_value_uint32(env, value, result);
}

export function napi_get_value_bool(env, value, result) {
	value = handles[value];
	if (typeof value !== 'boolean') {
		return Status.BooleanExpected();
	}
	return setResult(result, value);
}
