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

export function napi_get_value_string_utf8(env, value, buf, capacity, result) {
	value = handles[value];
	if (typeof value !== 'string') {
		return Status.StringExpected();
	}
	if (buf === 0) {
		return setResult(result, lengthBytesUTF8(value));
	}
	if (capacity <= 0) {
		return Status.InvalidArgument();
	}
	var writtenBytes = stringToUTF8(value, buf, capacity);
	if (result !== 0) {
		return setResult(result, writtenBytes);
	}
	return Status.Ok();
}

export function napi_get_value_string_utf16(env, value, buf, capacity, result) {
	value = handles[value];
	if (typeof value !== 'string') {
		return Status.StringExpected();
	}
	if (buf === 0) {
		return setResult(result, value.length);
	}
	if (capacity <= 0) {
		return Status.InvalidArgument();
	}
	var writtenBytes = stringToUTF16(value, buf, capacity << 1) >> 1;
	if (result !== 0) {
		return setResult(result, writtenBytes);
	}
	return Status.Ok();
}

export function napi_get_value_string_latin1(
	env,
	value,
	buf,
	capacity,
	result
) {
	value = handles[value];
	if (typeof value !== 'string') {
		return Status.StringExpected();
	}
	if (buf === 0) {
		return setResult(result, value.length);
	}
	if (capacity <= 0) {
		return Status.InvalidArgument();
	}
	// Keep space for the null byte
	capacity--;
	// Trim the string to the actual capacity, because `writeAsciiToMemory`
	// doesn't accept a limit argument.
	if (value.length > capacity) {
		value = value.slice(0, capacity);
	}
	writeAsciiToMemory(value, buf, false);
	if (result !== 0) {
		return setResult(result, value.length);
	}
	return Status.Ok();
}
