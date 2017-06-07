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
	return setValue(result, Symbol(UTF8ToString(description)));
}
