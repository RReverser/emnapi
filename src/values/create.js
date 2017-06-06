import { setValue } from '../utils';

var utf8Decoder = new TextDecoder();

export function napi_create_string_utf8(env, str, length, result) {
	return setValue(
		result,
		length === -1
			? UTF8ToString(str)
			: utf8Decoder.decode(HEAPU8.subarray(str, str + length))
	);
}

export function napi_create_number(env, value, result) {
	return setValue(result, value);
}
