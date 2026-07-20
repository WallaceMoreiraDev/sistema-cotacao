export function isValidEmail(value: string) {
  return /.+@.+\..+/.test(value);
}

export function isRequired(value: string) {
  return value.trim().length > 0;
}
