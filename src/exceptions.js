import {
	Status,
	caughtException,
	extractPendingException,
	hasPendingException,
	setValue,
	setResult,
	handles,
	ExtendedErrorInfo,
	lastError,
} from './utils';

function setPendingException(exception) {
	caughtException(exception);
	return Status.Ok();
}

export function napi_create_error(env, msg, result) {
	return setValue(result, new Error(handles[msg]));
}

export function napi_create_type_error(env, msg, result) {
	return setValue(result, new TypeError(handles[msg]));
}

export function napi_create_range_error(env, msg, result) {
	return setValue(result, new RangeError(handles[msg]));
}

export function napi_throw(env, error) {
	return setPendingException(handles[error]);
}

export function napi_throw_error(env, msg) {
	return setPendingException(new Error(UTF8ToString(msg)));
}

export function napi_throw_type_error(env, msg) {
	return setPendingException(new TypeError(UTF8ToString(msg)));
}

export function napi_throw_range_error(env, msg) {
	return setPendingException(new RangeError(UTF8ToString(msg)));
}

export function napi_is_exception_pending(env, result) {
	return setResult(result, hasPendingException());
}

export function napi_get_and_clear_last_exception(env, result) {
	return setValue(result, extractPendingException());
}

export function napi_get_last_error_info(env, result) {
	return setResult(result, ExtendedErrorInfo[lastError]);
}
