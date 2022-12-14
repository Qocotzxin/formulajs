import { emit } from "./subscription";
import {
  ChangeCallbacks,
  Events,
  FormFields,
  FormulaForm,
  FormulaValidations,
  FormulaFieldOptions,
  UserEvent,
} from "./types";
import { isCheckbox } from "./utils/type-helpers";
import { validationFns } from "./validation";

export const eventHandlingFns = {
  /**
   * Subscribes to input (or change), focus and blur events.
   */
  subscribeToInputChanges: (
    inputs: FormFields[],
    formData: FormulaForm,
    options?: FormulaValidations
  ): ChangeCallbacks => {
    const fns: ChangeCallbacks = {};
    const { onChange, onBlur, onFocus } = eventHandlingFns;

    for (const input of inputs) {
      const inputOptions = options && options[input.name];

      fns[input.name] = {
        // 'Change' is kept as name to simplify internal logic since this is not exposed to the user.
        [Events.change]: onChange(input, formData, inputOptions),
        [Events.focus]: onFocus(input, formData, inputOptions),
        [Events.blur]: onBlur(input, formData, inputOptions),
      };

      input.addEventListener(
        inputOptions?.validateOn || Events.change,
        fns[input.name].change
      );
      input.addEventListener(Events.focus, fns[input.name].focus);
      input.addEventListener(Events.blur, fns[input.name].blur);
    }

    return fns;
  },

  /**
   * Unsubscribes from input (or change), focus and blur events.
   */
  unsubscribeFromInputChanges: (
    inputs: FormFields[],
    fns: ChangeCallbacks,
    options?: FormulaValidations
  ) => {
    for (const input of inputs) {
      const inputOptions = options && options[input.name];
      input.removeEventListener(
        inputOptions?.validateOn || Events.change,
        fns[input.name].change!
      );
      input.removeEventListener(Events.focus, fns[input.name].focus);
      input.removeEventListener(Events.blur, fns[input.name].blur);
    }
  },

  /**
   * Subscribes to the form submit event and returns the added listener.
   */
  subscribeToSubmitEvent: (
    form: HTMLFormElement,
    inputs: FormFields[],
    formData: FormulaForm,
    options?: FormulaValidations
  ): UserEvent => {
    const { onSubmit } = eventHandlingFns;
    const onSubmitCallback = onSubmit(inputs, formData, options);
    form.addEventListener(Events.submit, onSubmitCallback);
    return onSubmitCallback;
  },

  /**
   * Removes the listener attached to the form submit event.
   */
  unsubscribeFromSubmitEvent: (form: HTMLFormElement, callback: UserEvent) => {
    form.removeEventListener(Events.submit, callback);
  },

  /**
   * Callback to be executed on focus event.
   * Does not execute validation.
   */
  onFocus: (
    input: FormFields,
    formData: FormulaForm,
    inputOptions?: FormulaFieldOptions
  ) => {
    return (_: Event) => {
      formData[input.name].isFocused = true;

      if (!inputOptions?.emitOn || inputOptions.emitOn.includes(Events.focus)) {
        emit(Events.focus, formData[input.name]);
      }
    };
  },

  /**
   * Callback to be executed on blur event.
   * Executes conditional validation based on user options.
   */
  onBlur: (
    input: FormFields,
    formData: FormulaForm,
    inputOptions?: FormulaFieldOptions
  ) => {
    return (_: Event) => {
      formData[input.name].isFocused = false;

      if (!formData[input.name].isTouched) {
        formData[input.name].isTouched = true;

        if (inputOptions?.validateDirtyOnly === false) {
          validationFns.applyFieldValidation(input, formData, inputOptions);
        }
      }

      if (!inputOptions?.emitOn || inputOptions?.emitOn.includes(Events.blur)) {
        emit(Events.blur, formData[input.name]);
      }
    };
  },

  /**
   * Callback to be executed on input (or change) event.
   * Always executes validation.
   */
  onChange: (
    input: FormFields,
    formData: FormulaForm,
    inputOptions?: FormulaFieldOptions
  ) => {
    return (e: Event) => {
      const selectedEvent = inputOptions?.validateOn || Events.change;
      const target = e.target as FormFields;
      formData[input.name].value = isCheckbox(input)
        ? !!(target as HTMLInputElement).checked
        : target.value;
      validationFns.applyFieldValidation(input, formData, inputOptions);

      if (!formData[input.name].isDirty) {
        formData[input.name].isDirty = true;
      }

      if (
        !inputOptions?.emitOn ||
        inputOptions?.emitOn.includes(selectedEvent)
      ) {
        emit(selectedEvent, formData[input.name]);
      }
    };
  },

  /**
   * Callback to be executed on submit event.
   * Always executes validation.
   */
  onSubmit: (
    inputs: FormFields[],
    formData: FormulaForm,
    options?: FormulaValidations
  ) => {
    return (e: Event) => {
      e.preventDefault();
      let isValid = true;

      for (const input of inputs) {
        validationFns.applyFieldValidation(
          input,
          formData,
          options && options[input.name]
        );

        if (!formData[input.name].isValid) {
          isValid = false;
        }
      }

      emit(Events.submit, { formData, isValid });
    };
  },
};
