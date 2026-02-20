import {
  StringSchema,
  NumberSchema,
  BooleanSchema,
  ArraySchema,
  ObjectSchema,
  EnumSchema,
} from "./schemas";
import type { Schema } from "./types";

export { ValidationFailedError } from "./errors";
export type { Schema, ValidationResult, ValidationError } from "./types";

export function string() {
  return new StringSchema();
}

export function number() {
  return new NumberSchema();
}

export function boolean() {
  return new BooleanSchema();
}

export function array<T>(itemSchema: Schema<T>) {
  return new ArraySchema(itemSchema);
}

export function object<T extends Record<string, Schema<unknown>>>(shape: T) {
  return new ObjectSchema(shape);
}

export function enumType<T extends string>(values: readonly T[]) {
  return new EnumSchema(values);
}
