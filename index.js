var Status = {
    Ok: 0,
    InvalidArg: 1,
    ObjectExpected: 2,
    StringExpected: 3,
    NameExpected: 4,
    FunctionExpected: 5,
    NumberExpected: 6,
    BooleanExpected: 7,
    ArrayExpected: 8,
    GenericFailure: 9,
    PendingException: 10,
    Cancelled: 11
};

var PropertyAttributes = {
    Default: 0,
    Writable: 1 << 0,
    Enumerable: 1 << 1,
    Configurable: 1 << 2,

    Static: 1 << 10
};

var ValueType = {
    'undefined': 0,
    'null': 1,
    'boolean': 2,
    'number': 3,
    'string': 4,
    'symbol': 5,
    'object': 6,
    'function': 7,
    'external': 8
};

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
        modname: UTF8ToString(HEAPU32[ptr++])
    };
}

export function napi_module_register(info) {
    info = readModule(info);
    var exports = {};
    var module = { exports: exports };
    withNewScope(function () {
        (0, info.registerFunc)(0, createValue(exports), createValue(module), 0);
    });
    modules[info.modname] = module.exports;
    return Status.Ok;
}

export var modules = {};

var SENTINEL = typeof Symbol !== 'undefined' ? Symbol("napi.sentinel") : { sentinel: true };

var pendingException = SENTINEL;

var handles = [
    SENTINEL,
    undefined,
    null,
    false,
    true
];

var initialScope = handles.length;

var utf8Decoder = new TextDecoder();

function setPendingException(exception) {
    if (pendingException === SENTINEL) {
        pendingException = exception;
    }
}

function extractPendingException() {
    var exception = pendingException;
    pendingException = SENTINEL;
    return exception;
}

function createScope() {
    return handles.length;
}

function leaveScope(scope) {
    handles.length = scope;
    if (scope === initialScope && pendingException !== SENTINEL) {
        // exited topmost native method
        throw extractPendingException();
    }
}

function withNewScope(callback) {
    var scope = createScope();
    var result = callback();
    leaveScope(scope);
    return result;
}

export function napi_open_handle_scope(env, result) {
    HEAPU32[result >> 2] = createScope();
    return Status.Ok;
}

export function napi_close_handle_scope(env, scope) {
    leaveScope(scope);
    return Status.Ok;
}

export function napi_open_escapable_handle_scope(env, result) {
    var status = napi_open_handle_scope(env, result);
    if (status === Status.Ok) {
        handles.push(SENTINEL);
    }
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
        return Status.GenericFailure;
    }
    handles[scope] = getValue(escapee);
    HEAPU32[result >> 2] = scope;
    return Status.Ok;
}

function getValue(handle) {
    return handles[handle];
}

function createValue(value) {
    var index = handles.indexOf(value);
    if (index === -1) {
        index = handles.push(value) - 1;
    }
    return index;
}

function setValue(result, value) {
    HEAPU32[result >> 2] = createValue(value);
    return Status.Ok;
}

export function napi_create_string_utf8(env, str, length, result) {
    return setValue(
        result,
        length === -1 ? UTF8ToString(str) : utf8Decoder.decode(HEAPU8.subarray(str, str + length))
    );
}

export function napi_create_number(env, value, result) {
    return setValue(result, value);
}

function wrapCallback(ptr, data) {
    var func = FUNCTION_TABLE_iii[ptr];
    return function () {
        var cbInfo = {
            this: this,
            args: Array.prototype.slice.call(arguments),
            data: data
        };
        return withNewScope(function () {
            return getValue(func(0, createValue(cbInfo)));
        });
    };
}

export function napi_define_properties(env, obj, propCount, props) {
    props >>= 2;
    for (var i = 0; i < propCount; i++) {
        // typedef struct {
        //   // One of utf8name or name should be NULL.
        //   const char* utf8name;
        //   napi_value name;

        //   napi_callback method;
        //   napi_callback getter;
        //   napi_callback setter;
        //   napi_value value;

        //   napi_property_attributes attributes;
        //   void* data;
        // } napi_property_descriptor;

        var namePtr = HEAPU32[props++];
        var nameHandle = HEAPU32[props++];
        var name = namePtr ? UTF8ToString(namePtr) : getValue(nameHandle);
        var methodPtr = HEAPU32[props++];
        var getterPtr = HEAPU32[props++];
        var setterPtr = HEAPU32[props++];
        var valuePtr = HEAPU32[props++];
        var attributes = HEAPU32[props++];
        var data = HEAPU32[props++];

        var descriptor = {
            enumerable: !!(attributes & PropertyAttributes.Enumerable),
            configurable: !!(attributes & PropertyAttributes.Configurable)
        };

        if (valuePtr || methodPtr) {
            descriptor.writable = !!(attributes & PropertyAttributes.Writable);
            descriptor.value = valuePtr ? getValue(valuePtr) : wrapCallback(methodPtr, data);
        } else {
            descriptor.get = wrapCallback(getterPtr, data);
            descriptor.set = wrapCallback(setterPtr, data);
        }

        Object.defineProperty(getValue(obj), name, descriptor);
    }
    return Status.Ok;
}

export function napi_typeof(env, value, result) {
    value = getValue(value);
    var t = typeof value;
    if (t === 'object' && value === null) {
        t = 'null';
    }
    HEAPU32[result >> 2] = ValueType[t];
    return Status.Ok;
}

export function napi_get_value_double(env, value, result) {
    value = getValue(value);
    if (typeof value !== 'number') {
        return Status.NumberExpected;
    }
    HEAPF64[result >> 3] = value;
    return Status.Ok;
}

export function napi_get_value_uint32(env, value, result) {
    value = getValue(value);
    if (typeof value !== 'number') {
        return Status.NumberExpected;
    }
    HEAPU32[result >> 2] = value;
    return Status.Ok;
}

export function napi_get_value_int32(env, value, result) {
    return napi_get_value_uint32(env, value, result);
}

export function napi_get_value_bool(env, value, result) {
    value = getValue(value);
    if (typeof value !== 'boolean') {
        return Status.BooleanExpected;
    }
    HEAPU32[result >> 2] = value;
    return Status.Ok;
}

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
    setPendingException(getValue(error));
}

export function napi_throw_error(env, msg) {
    setPendingException(createError(Error, msg));
}

export function napi_throw_type_error(env, msg) {
    setPendingException(createError(TypeError, msg));
}

export function napi_throw_range_error(env, msg) {
    setPendingException(createError(RangeError, msg));
}

export function napi_is_exception_pending(env, result) {
    HEAPU32[result >> 2] = pendingException !== SENTINEL;
    return Status.Ok;
}

export function napi_get_and_clear_last_exception(env, result) {
    return setValue(result, extractPendingException());
}

export function napi_is_error(env, value, result) {
    HEAPU32[result >> 2] = Object.prototype.toString.call(getValue(value)) === '[object Error]';
    return Status.Ok;
}

export function napi_get_cb_info(env, cbinfo, argcPtr, argvPtr, thisArgPtr, dataPtrPtr) {
    cbinfo = getValue(cbinfo);
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
