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
        version: HEAP32[ptr++],
        flags: HEAPU32[ptr++],
        filename: Pointer_stringify(HEAPU32[ptr++]),
        registerFunc: FUNCTION_TABLE_viiii[HEAPU32[ptr++]],
        modname: Pointer_stringify(HEAPU32[ptr++])
    };
}

export function napi_module_register(info) {
    info = readModule(info);
    console.log('Registering ', info);
    var exports = {};
    var module = { exports: exports };
    withNewScope(function () {
        (0, info.registerFunc)(0, createValue(exports), createValue(module), 0);
    });
    modules[info.modname] = module.exports;
    return Status.Ok;
}

var modules = {};

var pendingException = {
    exists: false, // because `throw undefined` is technically possible
    exception: null
};
var handles = null;
var scopes = [];
var utf8Encoder;
var utf8Decoder;

function setPendingException(exception) {
    if (pendingException.exists) return;
    pendingException.exists = true;
    pendingException.exception = exception;
}

function extractPendingException() {
    var exception = pendingException.exception;
    if (pendingException.exists) {
        pendingException.exists = false;
        pendingException.exception = null;
    }
    return exception;
}

function createScope() {
    handles = [];
    return scopes.push(handles) - 1;
}

function leaveScope() {
    scopes.pop();
    if (scopes.length === 0) {
        // exited topmost native method
        handles = null;
        if (pendingException.exists) {
            throw extractPendingException();
        }
    } else {
        handles = scopes[scopes.length - 1];
    }
}

function withNewScope(callback) {
    createScope();
    var result = callback();
    leaveScope();
    return result;
}

export function napi_open_handle_scope(env, result) {
    HEAPU32[result >> 2] = createScope();
    return Status.Ok;
}

export function napi_close_handle_scope(env, scope) {
    if (scope !== scopes.length - 1) {
        return Status.InvalidArg;
    }
    leaveScope();
    return Status.Ok;
}

export function napi_open_escapable_handle_scope(env, result) {
    return napi_open_handle_scope(env, result);
}

export function napi_close_escapable_handle_scope(env, scope) {
    return napi_close_handle_scope(env, scope);
}

export function napi_escape_handle(env, scope, escapee, result) {
    if (scope === 0 || scope !== scopes.length) {
        return Status.InvalidArg;
    }
    HEAPU32[result >> 2] = scopes[scope - 1].push(getValue(escapee)) - 1;
    return Status.Ok;
}

function getValue(handle) {
    return handles[handle];
}

function createValue(value) {
    return handles.push(value) - 1;
}

function setValue(result, value) {
    HEAPU32[result >> 2] = createValue(value);
    return Status.Ok;
}

export function napi_create_string_utf8(env, str, length, result) {
    utf8Decoder || (utf8Decoder = new TextDecoder());
    return setValue(result, utf8Decoder.decode(HEAPU8.subarray(str, str + length)));
}

export function napi_create_number(env, value, result) {
    return setValue(result, value);
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

        var name = Pointer_stringify(HEAPU32[props++] || HEAPU32[props++]);
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

        function wrapCallback(ptr) {
            var func = FUNCTION_TABLE_iii[ptr];
            return function () {
                return withNewScope(function () {
                    return getValue(func(0, /* TODO: callback info */ 0))
                });
            };
        }

        if (valuePtr || methodPtr) {
            descriptor.writable = !!(attributes & PropertyAttributes.Writable);
            descriptor.value = valuePtr ? getValue(valuePtr) : wrapCallback(methodPtr);
        } else {
            descriptor.get = wrapCallback(getterPtr);
            descriptor.set = wrapCallback(setterPtr);
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

export function napi_get_value_int32(env, value, result) {
    value = getValue(value);
    if (typeof value !== 'number') {
        return Status.NumberExpected;
    }
    HEAP32[result >> 2] = value;
    return Status.Ok;
}

export function napi_get_value_uint32(env, value, result) {
    return napi_get_value_int32(env, value, result);
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
    return new Ctor(Pointer_stringify(msg));
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
    HEAPU32[result >> 2] = pendingException.exists;
    return Status.Ok;
}

export function napi_get_and_clear_last_exception(env, result) {
    return setValue(result, extractPendingException());
}
