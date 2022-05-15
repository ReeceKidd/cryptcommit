import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { TextField } from '@mui/material';
import FormNavigationButtons from '../../../../FormNavigationButtons/FormNavigationButtons';

interface AmountFormProps {
  amount: string;
  setAmount: (amount: string) => void;
  handlePreviousStep: () => void;
  handleNextStep: () => void;
}

const validationSchema = Yup.object({
  amount: Yup.number()
    .required('Amount is required')
    .typeError('Amount must be a number')
});

const AmountForm = ({
  amount,
  setAmount,
  handlePreviousStep,
  handleNextStep
}: AmountFormProps) => {
  const formik = useFormik({
    initialValues: {
      amount: amount
    },
    validationSchema,
    onSubmit: ({ amount }) => {
      setAmount(amount);
      handleNextStep();
    }
  });

  return (
    <>
      <h2> Amount</h2>
      <form onSubmit={formik.handleSubmit}>
        <TextField
          fullWidth
          id="amount"
          name="amount"
          label="Amount"
          value={formik.values.amount}
          onChange={formik.handleChange}
          error={formik.touched.amount && Boolean(formik.errors.amount)}
          helperText={formik.touched.amount && formik.errors.amount}
        />
        <FormNavigationButtons handlePreviousStep={handlePreviousStep} />
      </form>
    </>
  );
};

export default AmountForm;
