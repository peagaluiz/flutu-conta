
import * as yup from 'yup';

export const brNumber = (label = 'Campo') =>
    yup
        .number()
        .transform((value, originalValue) => {
            if (typeof originalValue === 'string') {
                if (originalValue.trim() === '') return undefined;
                const parsed = parseFloat(originalValue.replace(/\./g, '').replace(',', '.'));
                return isNaN(parsed) ? value : parsed;
            }
            return value;
        })
        .test('is-valid-br-number', `${label} em formato inválido`, function (value) {
            const original = this.originalValue;
            if (typeof original === 'string' && original.trim() !== '') {
                return /^\d{1,3}(\.\d{3})*,\d$/.test(original);
            }
            return true;
        })
        .typeError(`O campo ${label} precisa ser um número`)
        .required(`O campo ${label} é obrigatório`)
        .min(0, `${label} precisa ser maior ou igual a 0.`)
        .max(99999.9, `${label} precisa ser menor que 99.999,9`);
