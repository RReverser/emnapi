import { SENTINEL, Status, createScope, leaveScope, handles } from './utils';

export function napi_open_handle_scope(env, result) {
	HEAPU32[result >> 2] = createScope();
	return Status.Ok();
}

export function napi_close_handle_scope(env, scope) {
	leaveScope(scope);
	return Status.Ok();
}

export function napi_open_escapable_handle_scope(env, result) {
	var status = napi_open_handle_scope(env, result);
	handles.push(SENTINEL);
	return status;
}

export function napi_close_escapable_handle_scope(env, scope) {
	if (handles[scope] !== SENTINEL) {
		// a value has escaped, need to keep it
		scope++;
	}
	return napi_close_handle_scope(env, scope);
}

export function napi_escape_handle(env, scope, escapee, result) {
	if (handles[scope] !== SENTINEL) {
		// something has already escaped
		return Status.GenericFailure();
	}
	handles[scope] = handles[escapee];
	HEAPU32[result >> 2] = scope;
	return Status.Ok();
}
