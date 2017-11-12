import {
	Status,
	handles,
	createValue,
	setValue,
	wrapCallback,
	hasPendingException,
	caughtException,
	undefinedHandle,
	readString,
} from '../utils';

export function napi_get_cb_info(
	env,
	cbinfo,
	argcPtr,
	argvPtr,
	thisArgPtr,
	dataPtrPtr
) {
	cbinfo = handles[cbinfo];
	argcPtr >>= 2;
	var argc = HEAPU32[argcPtr];
	var actualArgc = cbinfo.args.length;
	HEAPU32[argcPtr] = actualArgc;
	if (argc < actualArgc) {
		actualArgc = argc;
	}
	argvPtr >>= 2;
	var i = 0;
	for (; i < actualArgc; i++) {
		HEAPU32[argvPtr + i] = createValue(cbinfo.args[i]);
	}
	for (; i < argc; i++) {
		HEAPU32[argvPtr + i] = undefinedHandle;
	}
	if (thisArgPtr !== 0) {
		setValue(thisArgPtr, cbinfo.this);
	}
	if (dataPtrPtr !== 0) {
		HEAPU32[dataPtrPtr >> 2] = cbinfo.data;
	}
	return Status.Ok();
}

const canSetName = Object.getOwnPropertyDescriptor(Function.prototype, 'name')
	.configurable;

export function napi_create_function(env, namePtr, nameLen, cb, data, result) {
	var func = wrapCallback(cb, data);
	if (canSetName) {
		Object.defineProperty(func, 'name', {
			value: readString(namePtr, nameLen),
		});
	}
	return setValue(result, func);
}

export function napi_call_function(env, recv, func, argc, argv, result) {
	if (hasPendingException()) {
		return Status.PendingException();
	}
	recv = handles[recv];
	func = handles[func];
	argv >>= 2;
	var args = new Array(argc);
	for (var i = 0; i < argc; i++) {
		args[i] = handles[HEAPU32[argv + i]];
	}
	try {
		return setValue(result, func.apply(recv, args));
	} catch (exception) {
		return caughtException(exception);
	}
}
