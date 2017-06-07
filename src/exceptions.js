import {
	extractPendingException,
	hasPendingException,
	setPendingException,
	setValue,
	setResult,
	handles,
} from './utils';

function createError(Ctor, msg) {
	return new Ctor(UTF8ToString(msg));
}

export function napi_create_error(env, msg, result) {
	return setValue(result, createError(Error, msg));
}

export function napi_create_type_error(env, msg, result) {
	return setValue(result, createError(TypeError, msg));
}

export function napi_create_range_error(env, msg, result) {
	return setValue(result, createError(RangeError, msg));
}

export function napi_throw(env, error) {
	return setPendingException(handles[error]);
}

export function napi_throw_error(env, msg) {
	return setPendingException(createError(Error, msg));
}

export function napi_throw_type_error(env, msg) {
	return setPendingException(createError(TypeError, msg));
}

export function napi_throw_range_error(env, msg) {
	return setPendingException(createError(RangeError, msg));
}

export function napi_is_exception_pending(env, result) {
	return setResult(result, hasPendingException());
}

export function napi_get_and_clear_last_exception(env, result) {
	return setValue(result, extractPendingException());
}