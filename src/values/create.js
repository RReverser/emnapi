import { setValue, handles, readString, Status } from '../utils';

export function napi_create_string_utf8(env, str, length, result) {
	if (length < -1) {
		return Status.InvalidArgument();
	}
	return setValue(result, readString(str, length));
}

export function napi_create_string_utf16(env, str, length, result) {
	if (length < -1) {
		return Status.InvalidArgument();
	}
	// Horrible, horrible hack to temporarily limit length of the string...
	// We need this because UTF16ToString doesn't accept `length`.
	var lastIndex, lastChar;
	if (length >= 0) {
		lastIndex = (str >> 1) + length;
		lastChar = HEAPU16[lastIndex];
		HEAPU16[lastIndex] = 0;
	}
	var status = setValue(result, UTF16ToString(str));
	if (length >= 0) {
		HEAPU16[lastIndex] = lastChar;
	}
	return status;
}

export function napi_create_string_latin1(env, str, length, result) {
	if (length < -1) {
		return Status.InvalidArgument();
	}
	// Same issue as in napi_create_string_utf16, but also doesn't
	// properly decode bytes >= 0x80. Easier to reimplement.
	var buf = '';
	// Using `!= 0` here instead of `>= 0` to cover cases of both -1 for
	// unlimited reading and of non-negative integers as proper limits.
	while (length-- !== 0) {
		var byte = HEAPU8[str++];
		if (byte === 0) break;
		buf += String.fromCharCode(byte);
	}
	return setValue(result, buf);
}

export function napi_create_int32(env, value, result) {
	return napi_create_double(env, value, result);
}

export function napi_create_uint32(env, value, result) {
	return napi_create_double(env, value, result >>> 0);
}

export function napi_create_double(env, value, result) {
	return setValue(result, value);
}

export function napi_create_object(env, result) {
	return setValue(result, {});
}

export function napi_create_array(env, result) {
	return setValue(result, []);
}

export function napi_create_array_with_length(env, length, result) {
	return setValue(result, new Array(length));
}

export function napi_create_symbol(env, description, result) {
	description = description ? handles[description] : '';
	return setValue(result, Symbol(description));
}
