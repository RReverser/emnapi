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

function createError(Ctor, code, msg, result) {
	let err = new Ctor(handles[msg]);
	if (code !== 0) {
		err.code = handles[code];
	}
	return setValue(result, err);
}

export function napi_create_error(env, code, msg, result) {
	return createError(Error, code, msg, result);
}

export function napi_create_type_error(env, code, msg, result) {
	return createError(TypeError, code, msg, result);
}

export function napi_create_range_error(env, code, msg, result) {
	return createError(RangeError, code, msg, result);
}

export function napi_throw(env, error) {
	return setPendingException(handles[error]);
}

function throwError(Ctor, code, msg) {
	let err = new Ctor(UTF8ToString(msg));
	if (code !== 0) {
		err.code = UTF8ToString(code);
	}
	return setPendingException(err);
}

export function napi_throw_error(env, code, msg) {
	return throwError(Error, code, msg);
}

export function napi_throw_type_error(env, code, msg) {
	return throwError(TypeError, code, msg);
}

export function napi_throw_range_error(env, code, msg) {
	return throwError(RangeError, code, msg);
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
