import * as yup from "yup";
const signupSchema = yup.object({
  userName: yup.string().required(),
  email: yup.string().email().required(),
  password: yup.string().required(),
  userImage: yup.string().url().required(),
});

export default signupSchema;
