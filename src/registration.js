import { Status, withNewScope, createValue } from './utils';

function readModule(ptr) {
	// typedef struct {
	//   int nm_version;
	//   unsigned int nm_flags;
	//   const char* nm_filename;
	//   napi_addon_register_func nm_register_func;
	//   const char* nm_modname;
	//   void* nm_priv;
	//   void* reserved[4];
	// } napi_module;
	ptr >>= 2;
	return {
		version: HEAPU32[ptr++],
		flags: HEAPU32[ptr++],
		filename: UTF8ToString(HEAPU32[ptr++]),
		registerFunc: FUNCTION_TABLE_viiii[HEAPU32[ptr++]],
		modname: UTF8ToString(HEAPU32[ptr++]),
	};
}

export function napi_module_register(info) {
	info = readModule(info);
	var mod = typeof module !== 'undefined' ? module : { exports: {} };
	withNewScope(function() {
		(0, info.registerFunc)(0, createValue(mod.exports), createValue(mod), 0);
	});
	Module['napi'] = mod.exports;
	return Status.Ok();
}
