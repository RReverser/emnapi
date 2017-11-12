import { withNewScope, createValue, handles } from './utils';

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
		registerFunc: FUNCTION_TABLE_iii[HEAPU32[ptr++]],
		modname: UTF8ToString(HEAPU32[ptr++]),
	};
}

export function napi_module_register(info) {
	info = readModule(info);
	return withNewScope(function() {
		let exports = typeof module !== 'undefined' ? module.exports : {};
		let exportsHandle = createValue(exports);
		let newExportsHandle = (0, info.registerFunc)(0, exportsHandle);
		if (newExportsHandle !== 0 && newExportsHandle !== exportsHandle) {
			exports = handles[newExportsHandle];
			if (typeof module !== 'undefined') {
				module.exports = exports;
			}
		}
		Module['napi'] = exports;
	});
}
