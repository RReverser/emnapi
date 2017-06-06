import {
	Status,
	handles,
	setValue,
	setResult,
	safeJS,
	wrapCallback,
	hasPendingException,
	setPendingException,
} from '../utils';

export function napi_set_property(env, obj, key, value) {
	return napi_set_element(env, obj, handles[key], value);
}

export function napi_get_property(env, obj, key, result) {
	return napi_get_element(env, obj, handles[key], result);
}

export function napi_has_property(env, obj, key, result) {
	return napi_has_element(env, obj, handles[key], result);
}

export function napi_get_property_names(env, obj, result) {
	return safeJS(result, true, Object.keys, result);
}

export function napi_set_named_property(env, obj, name, value) {
	return napi_set_element(env, obj, UTF8ToString(name), value);
}

export function napi_get_named_property(env, obj, name, result) {
	return napi_get_element(env, obj, UTF8ToString(name), result);
}

export function napi_has_named_property(env, obj, name, result) {
	return napi_has_element(env, obj, UTF8ToString(name), result);
}

export function napi_set_element(env, obj, index, value) {
	if (hasPendingException()) {
		return Status.PendingException;
	}
	// safeJS doesn't help here because we don't have result
	// so it's fine to do some duplication
	obj = handles[obj];
	value = handles[value];
	try {
		obj[index] = value;
		return Status.Ok;
	} catch (exception) {
		setPendingException(exception);
		return Status.PendingException;
	}
}

export function napi_get_element(env, obj, index, result) {
	if (hasPendingException()) {
		return Status.PendingException;
	}
	// safeJS doesn't help here because we don't have result
	// so it's fine to do some duplication
	obj = handles[obj];
	try {
		return setValue(result, obj[index]);
	} catch (exception) {
		setPendingException(exception);
		return Status.PendingException;
	}
}

export function napi_has_element(env, obj, index, result) {
	if (hasPendingException()) {
		return Status.PendingException;
	}
	// safeJS doesn't help here because we don't have result
	// so it's fine to do some duplication
	obj = handles[obj];
	try {
		return setResult(result, index in obj);
	} catch (exception) {
		setPendingException(exception);
		return Status.PendingException;
	}
}

var PropertyAttributes = {
	Default: 0,
	Writable: 1 << 0,
	Enumerable: 1 << 1,
	Configurable: 1 << 2,

	Static: 1 << 10,
};

export function napi_define_properties(env, obj, propCount, props) {
	if (hasPendingException()) {
		return Status.PendingException;
	}
	props >>= 2;
	obj = handles[obj];
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
		var name = namePtr ? UTF8ToString(namePtr) : handles[nameHandle];
		var methodPtr = HEAPU32[props++];
		var getterPtr = HEAPU32[props++];
		var setterPtr = HEAPU32[props++];
		var valueHandle = HEAPU32[props++];
		var attributes = HEAPU32[props++];
		var data = HEAPU32[props++];

		var descriptor = {
			enumerable: !!(attributes & PropertyAttributes.Enumerable),
			configurable: !!(attributes & PropertyAttributes.Configurable),
		};

		if (valueHandle || methodPtr) {
			descriptor.writable = !!(attributes & PropertyAttributes.Writable);
			descriptor.value = valueHandle
				? handles[valueHandle]
				: wrapCallback(methodPtr, data);
		} else {
			descriptor.get = wrapCallback(getterPtr, data);
			descriptor.set = wrapCallback(setterPtr, data);
		}

		try {
			Object.defineProperty(obj, name, descriptor);
		} catch (exception) {
			setPendingException(exception);
			return Status.PendingException;
		}
	}
	return Status.Ok;
}
