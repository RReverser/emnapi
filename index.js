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

function safeJS(result, toValue, callback/*, ...values*/) {
    if (pendingException !== SENTINEL) {
        return Status.PendingException;
    }
    var resultValue;
    var inputs = [];
    for (var i = 3; i < arguments.length; i++) {
        inputs.push(getValue(arguments[i]));
    }
    try {
        resultValue = callback.apply(null, inputs);
    } catch (exception) {
        pendingException = exception;
        return Status.PendingException;
    }
    if (toValue) {
        resultValue = createValue(resultValue);
    }
    return setResult(result, resultValue);
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
    if (pendingException !== SENTINEL) {
        return Status.PendingException;
    }
    pendingException = exception;
    return Status.Ok;
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
    try {
        return callback();
    } finally {
        leaveScope(scope);
    }
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
    return setResult(result, createValue(value));
}

function setResult(result, value) {
    HEAPU32[result >> 2] = value;
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
    return setResult(result, ValueType[t]);
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
    return setResult(result, value);
}

export function napi_get_value_int32(env, value, result) {
    return napi_get_value_uint32(env, value, result);
}

export function napi_get_value_bool(env, value, result) {
    value = getValue(value);
    if (typeof value !== 'boolean') {
        return Status.BooleanExpected;
    }
    return setResult(result, value);
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
    return setPendingException(getValue(error));
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
    return setResult(result, pendingException !== SENTINEL);
}

export function napi_get_and_clear_last_exception(env, result) {
    return setValue(result, extractPendingException());
}

var toString = Object.prototype.toString;

function checkTag(result, value, tag) {
    return safeJS(result, false, function (value) {
        // can fail on a revoked Proxy
        // https://tc39.github.io/ecma262/#sec-object.prototype.tostring
        return toString.call(value) === '[object ' + tag + ']';
    }, value);
}

export function napi_is_error(env, value, result) {
    return checkTag(result, value, 'Error');
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

export function napi_coerce_to_bool(env, value, result) {
    if (pendingException !== SENTINEL) {
        return Status.PendingException;
    }
    // can't fail
    // https://tc39.github.io/ecma262/#sec-toboolean
    return setResult(result, !!getValue(value));
}

export function napi_coerce_to_number(env, value, result) {
    // can fail on symbols and objects
    // https://tc39.github.io/ecma262/#sec-tonumber
    return safeJS(result, true, Number, value);
}

export function napi_coerce_to_object(env, value, result) {
    // can't fail when called as regular function
    // https://tc39.github.io/ecma262/#sec-object-constructor
    return setValue(result, Object(value));
}

export function napi_coerce_to_string(env, value, result) {
    // can fail on symbols and objects
    // https://tc39.github.io/ecma262/#sec-tostring
    return safeJS(result, true, String, value);
}

export function napi_instanceof(env, value, Ctor, result) {
    return safeJS(result, false, function (value, Ctor) {
        // can fail on non-objects and more
        // https://tc39.github.io/ecma262/#sec-instanceofoperator
        return value instanceof Ctor;
    }, value, Ctor);
}

export function napi_is_array(env, value, result) {
    // can fail on a revoked Proxy
    // https://tc39.github.io/ecma262/#sec-isarray
    return safeJS(result, false, Array.isArray, value);
}

export function napi_is_arraybuffer(env, value, result) {
    return checkTag(result, value, 'ArrayBuffer');
}

export function napi_is_typedarray(env, value, result) {
    if (pendingException !== SENTINEL) {
        return Status.PendingException;
    }
    // can't fail, only checks if an internal slot is present
    // https://tc39.github.io/ecma262/#sec-arraybuffer.isview
    return setResult(result, ArrayBuffer.isView(getValue(value)));
}

export function napi_strict_equals(env, lhs, rhs, result) {
    if (pendingException !== SENTINEL) {
        return Status.PendingException;
    }
    lhs = getValue(lhs);
    rhs = getValue(rhs);
    // can't fail
    // https://tc39.github.io/ecma262/#sec-strict-equality-comparison
    return setResult(result, lhs === rhs);
}

export function napi_set_property(env, obj, key, value) {
    if (pendingException !== SENTINEL) {
        return Status.PendingException;
    }
    // safeJS doesn't help here because we don't have result
    // so it's fine to do some duplication
    obj = getValue(obj);
    key = getValue(key);
    value = getValue(value);
    try {
        obj[key] = value;
        return Status.Ok;
    } catch (exception) {
        pendingException = exception;
        return Status.PendingException;
    }
}

export function napi_get_property(env, obj, key, result) {
    return safeJS(result, true, function (obj, key) {
        return obj[key];
    }, obj, key);
}

export function napi_has_property(env, obj, key, result) {
    return safeJS(result, false, function (obj, key) {
        return key in obj;
    }, obj, key);
}

export function napi_get_property_names(env, obj, result) {
    return safeJS(result, true, Object.keys, result);
}
