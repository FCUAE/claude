import { ValidationError } from "./types";

export class ValidationFailedError extends Error {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    const message = errors
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ");
    super(message);
    this.name = "ValidationFailedError";
    this.errors = errors;
  }
}
