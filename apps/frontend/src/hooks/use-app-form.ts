import { createFormHook } from '@tanstack/react-form';
import { FormInput } from '@/components/form-input';
import { FormSelect } from '@/components/form-select';
import { FormArquivo } from '@/components/form-arquivo';
import { FormCheckboxes } from '@/components/form-checkboxes';
import { fieldContext, formContext } from '@/components/form-input/context';

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    Input: FormInput,
    Select: FormSelect,
    Checkboxes: FormCheckboxes,
    Arquivo: FormArquivo,
  },
  formComponents: {},
});
