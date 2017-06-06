import { Status, handles, createValue, setValue } from '../utils';

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
	if (actualArgc < argc) {
		argc = actualArgc;
	}
	argvPtr >>= 2;
	for (var i = 0; i < argc; i++) {
		HEAPU32[argvPtr + i] = createValue(cbinfo.args[i]);
	}
	setValue(thisArgPtr, cbinfo.this);
	HEAPU32[dataPtrPtr >> 2] = cbinfo.data;
	return Status.Ok;
}
