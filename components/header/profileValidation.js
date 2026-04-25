import * as yup from "yup";

export const profileSchema = yup.object({
  displayName: yup
    .string()
    .trim()
    .required("Nome nao pode estar vazio")
    .min(2, "Nome precisa ter pelo menos 2 caracteres")
    .max(80, "Nome pode ter no maximo 80 caracteres"),
});
