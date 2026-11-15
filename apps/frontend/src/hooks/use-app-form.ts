import { createFormHook } from '@tanstack/react-form';
import { FormInput } from '@/components/form-input';
import { fieldContext, formContext } from '@/components/form-input/context';

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { Input: FormInput },
  formComponents: {},
});
