import { setValue, handles, readString } from '../utils';

export function napi_create_string_utf8(env, str, length, result) {
	return setValue(result, readString(str, length));
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
