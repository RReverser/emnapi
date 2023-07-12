# emnapi
N-API implementation for Emscripten. This project is **abandoned**, please see [Toyo Li's emnapi](https://github.com/toyobayashi/emnapi) instead.

Currently implemented methods (not counting bugs):

 - [x] napi_module_register
 - [x] napi_get_last_error_info
 - [x] napi_get_undefined
 - [x] napi_get_null
 - [x] napi_get_global
 - [x] napi_get_boolean
 - [x] napi_create_object
 - [x] napi_create_array
 - [x] napi_create_array_with_length
 - [x] napi_create_double
 - [x] napi_create_int32
 - [x] napi_create_uint32
 - [ ] napi_create_int64
 - [x] napi_create_string_latin1
 - [x] napi_create_string_utf8
 - [x] napi_create_string_utf16
 - [x] napi_create_symbol
 - [x] napi_create_function
 - [x] napi_create_error
 - [x] napi_create_type_error
 - [x] napi_create_range_error
 - [x] napi_typeof
 - [x] napi_get_value_double
 - [x] napi_get_value_int32
 - [x] napi_get_value_uint32
 - [ ] napi_get_value_int64
 - [x] napi_get_value_bool
 - [x] napi_get_value_string_latin1
 - [x] napi_get_value_string_utf8
 - [x] napi_get_value_string_utf16
 - [x] napi_coerce_to_bool
 - [x] napi_coerce_to_number
 - [x] napi_coerce_to_object
 - [x] napi_coerce_to_string
 - [ ] napi_get_prototype
 - [x] napi_get_property_names
 - [x] napi_set_property
 - [x] napi_has_property
 - [x] napi_get_property
 - [ ] napi_delete_property
 - [ ] napi_has_own_property
 - [x] napi_set_named_property
 - [x] napi_has_named_property
 - [x] napi_get_named_property
 - [x] napi_set_element
 - [x] napi_has_element
 - [x] napi_get_element
 - [ ] napi_delete_element
 - [x] napi_define_properties
 - [x] napi_is_array
 - [ ] napi_get_array_length
 - [x] napi_strict_equals
 - [x] napi_call_function
 - [ ] napi_new_instance
 - [x] napi_instanceof
 - [x] napi_get_cb_info
 - [ ] napi_get_new_target
 - [ ] napi_define_class
 - [ ] napi_wrap
 - [ ] napi_unwrap
 - [ ] napi_remove_wrap
 - [ ] napi_create_external
 - [ ] napi_get_value_external
 - [ ] napi_create_reference
 - [ ] napi_delete_reference
 - [ ] napi_reference_ref
 - [ ] napi_reference_unref
 - [ ] napi_get_reference_value
 - [x] napi_open_handle_scope
 - [x] napi_close_handle_scope
 - [x] napi_open_escapable_handle_scope
 - [x] napi_close_escapable_handle_scope
 - [x] napi_escape_handle
 - [x] napi_throw
 - [x] napi_throw_error
 - [x] napi_throw_type_error
 - [x] napi_throw_range_error
 - [x] napi_is_error
 - [x] napi_is_exception_pending
 - [x] napi_get_and_clear_last_exception
 - [x] napi_is_arraybuffer
 - [ ] napi_create_arraybuffer
 - [ ] napi_create_external_arraybuffer
 - [ ] napi_get_arraybuffer_info
 - [x] napi_is_typedarray
 - [ ] napi_create_typedarray
 - [ ] napi_get_typedarray_info
 - [ ] napi_create_dataview
 - [ ] napi_is_dataview
 - [ ] napi_get_dataview_info
 - [ ] napi_get_version
 - [ ] napi_create_promise
 - [ ] napi_resolve_deferred
 - [ ] napi_reject_deferred
 - [ ] napi_is_promise
 - [ ] napi_adjust_external_memory
 - [ ] napi_run_script
