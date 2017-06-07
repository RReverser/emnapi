import { setValue } from '../utils';

export function napi_create_string_utf8(env, str, length, result) {
	return setValue(
		result,
		length === -1 ? UTF8ToString(str) : Pointer_stringify(str, length) // TODO
	);
}

export function napi_create_number(env, value, result) {
	return setValue(result, value);
}
