import { FormFields, FormulaForm, InputTypes, InputValue } from "./types";
import { isCheckbox, isRadio } from "./utils/type-helpers";

export const formDataFns = {
  /**
   * Returns the main formula object based on each input value and name.
   */
  createFormData(inputs: FormFields[]): FormulaForm {
    return inputs.reduce<FormulaForm>((acc, cur) => {
      return {
        ...acc,
        [cur.name]: {
          value: formDataFns.getInputValue(cur, acc[cur.name]?.value),
          isValid: true,
          isTouched: false,
          isFocused: false,
          isDirty: false,
          errors: [],
          _inputType:
            cur instanceof HTMLInputElement ? (cur.type as InputTypes) : null,
        },
      };
    }, {});
  },

  /**
   * Parse input data to return the correct value depending on the type.
   */
  getInputValue(
    input: FormFields,
    previousInputValue: InputValue | undefined
  ): InputValue {
    return isRadio(input)
      ? (input as HTMLInputElement).checked
        ? input.value
        : previousInputValue || ""
      : isCheckbox(input)
      ? (input as HTMLInputElement).checked
      : input.value;
  },
};
