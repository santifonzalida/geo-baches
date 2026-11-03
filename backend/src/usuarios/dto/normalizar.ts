/**
 * Para @Transform de class-transformer: recorta y pasa a minúsculas los strings.
 * Se usa en el alta y en el login, así "Admin" y "admin" son siempre la misma cuenta.
 */
export const normalizar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
