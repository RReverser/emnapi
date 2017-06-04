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
    (0, info.registerFunc)(0, createValue(exports), createValue(module), 0);
    modules[info.modname] = module.exports;
}

var modules = {};

var handles = [];
var scopes = [handles];
var utf8Encoder;
var utf8Decoder;

export function napi_open_handle_scope(env, result) {
    HEAPU32[result >> 2] = scopes.push(handles = []) - 1;
    return Status.Ok;
}

export function napi_close_handle_scope(env, scope) {
    if (scope !== scopes.length - 1) {
        return Status.InvalidArg;
    }
    scopes.pop();
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
}

function getValue(handle) {
    return handles[handle];
}

function createValue(value) {
    return handles.push(value) - 1;
}

function setValue(result, value) {
    HEAPU32[result >> 2] = createValue(value);
}

export function napi_create_string_utf8(env, str, length, result) {
    utf8Decoder || (utf8Decoder = new TextDecoder());
    setValue(result, utf8Decoder.decode(HEAPU8.subarray(str, str + length)));
    return status.ok;
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
                return getValue(func(0, /* TODO: callback info */ 0));
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
}
