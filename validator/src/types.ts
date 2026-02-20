export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface Schema<T> {
  parse(input: unknown): T;
  safeParse(input: unknown): ValidationResult<T>;
  optional(): Schema<T | undefined>;
}
