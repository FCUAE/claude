import { Schema, ValidationResult, ValidationError } from "./types";
import { ValidationFailedError } from "./errors";

abstract class BaseSchema<T> implements Schema<T> {
  abstract safeParse(input: unknown): ValidationResult<T>;

  parse(input: unknown): T {
    const result = this.safeParse(input);
    if (result.success) {
      return result.data;
    }
    throw new ValidationFailedError(result.errors);
  }

  optional(): Schema<T | undefined> {
    return new OptionalSchema(this);
  }
}

class OptionalSchema<T> extends BaseSchema<T | undefined> {
  constructor(private inner: Schema<T>) {
    super();
  }

  safeParse(input: unknown): ValidationResult<T | undefined> {
    if (input === undefined || input === null) {
      return { success: true, data: undefined };
    }
    return this.inner.safeParse(input);
  }
}

export class StringSchema extends BaseSchema<string> {
  private minLen?: number;
  private maxLen?: number;
  private pattern?: RegExp;
  private emailCheck = false;

  safeParse(input: unknown): ValidationResult<string> {
    const errors: ValidationError[] = [];

    if (typeof input !== "string") {
      return {
        success: false,
        errors: [{ path: "", message: "Expected a string", code: "invalid_type" }],
      };
    }

    if (this.minLen !== undefined && input.length < this.minLen) {
      errors.push({
        path: "",
        message: `String must be at least ${this.minLen} characters`,
        code: "too_small",
      });
    }

    if (this.maxLen !== undefined && input.length > this.maxLen) {
      errors.push({
        path: "",
        message: `String must be at most ${this.maxLen} characters`,
        code: "too_big",
      });
    }

    if (this.pattern && !this.pattern.test(input)) {
      errors.push({
        path: "",
        message: "String does not match the required pattern",
        code: "invalid_pattern",
      });
    }

    if (this.emailCheck && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
      errors.push({
        path: "",
        message: "Invalid email address",
        code: "invalid_email",
      });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: input };
  }

  min(length: number): StringSchema {
    const schema = this.clone();
    schema.minLen = length;
    return schema;
  }

  max(length: number): StringSchema {
    const schema = this.clone();
    schema.maxLen = length;
    return schema;
  }

  regex(pattern: RegExp): StringSchema {
    const schema = this.clone();
    schema.pattern = pattern;
    return schema;
  }

  email(): StringSchema {
    const schema = this.clone();
    schema.emailCheck = true;
    return schema;
  }

  private clone(): StringSchema {
    const schema = new StringSchema();
    schema.minLen = this.minLen;
    schema.maxLen = this.maxLen;
    schema.pattern = this.pattern;
    schema.emailCheck = this.emailCheck;
    return schema;
  }
}

export class NumberSchema extends BaseSchema<number> {
  private minVal?: number;
  private maxVal?: number;
  private integerCheck = false;

  safeParse(input: unknown): ValidationResult<number> {
    const errors: ValidationError[] = [];

    if (typeof input !== "number" || isNaN(input)) {
      return {
        success: false,
        errors: [{ path: "", message: "Expected a number", code: "invalid_type" }],
      };
    }

    if (this.integerCheck && !Number.isInteger(input)) {
      errors.push({
        path: "",
        message: "Expected an integer",
        code: "not_integer",
      });
    }

    if (this.minVal !== undefined && input < this.minVal) {
      errors.push({
        path: "",
        message: `Number must be at least ${this.minVal}`,
        code: "too_small",
      });
    }

    if (this.maxVal !== undefined && input > this.maxVal) {
      errors.push({
        path: "",
        message: `Number must be at most ${this.maxVal}`,
        code: "too_big",
      });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: input };
  }

  min(value: number): NumberSchema {
    const schema = this.clone();
    schema.minVal = value;
    return schema;
  }

  max(value: number): NumberSchema {
    const schema = this.clone();
    schema.maxVal = value;
    return schema;
  }

  integer(): NumberSchema {
    const schema = this.clone();
    schema.integerCheck = true;
    return schema;
  }

  private clone(): NumberSchema {
    const schema = new NumberSchema();
    schema.minVal = this.minVal;
    schema.maxVal = this.maxVal;
    schema.integerCheck = this.integerCheck;
    return schema;
  }
}

export class BooleanSchema extends BaseSchema<boolean> {
  safeParse(input: unknown): ValidationResult<boolean> {
    if (typeof input !== "boolean") {
      return {
        success: false,
        errors: [{ path: "", message: "Expected a boolean", code: "invalid_type" }],
      };
    }
    return { success: true, data: input };
  }
}

export class ArraySchema<T> extends BaseSchema<T[]> {
  private minLen?: number;
  private maxLen?: number;

  constructor(private itemSchema: Schema<T>) {
    super();
  }

  safeParse(input: unknown): ValidationResult<T[]> {
    if (!Array.isArray(input)) {
      return {
        success: false,
        errors: [{ path: "", message: "Expected an array", code: "invalid_type" }],
      };
    }

    const errors: ValidationError[] = [];

    if (this.minLen !== undefined && input.length < this.minLen) {
      errors.push({
        path: "",
        message: `Array must have at least ${this.minLen} items`,
        code: "too_small",
      });
    }

    if (this.maxLen !== undefined && input.length > this.maxLen) {
      errors.push({
        path: "",
        message: `Array must have at most ${this.maxLen} items`,
        code: "too_big",
      });
    }

    const results: T[] = [];
    for (let i = 0; i < input.length; i++) {
      const result = this.itemSchema.safeParse(input[i]);
      if (result.success) {
        results.push(result.data);
      } else {
        for (const err of result.errors) {
          errors.push({
            ...err,
            path: err.path ? `[${i}].${err.path}` : `[${i}]`,
          });
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: results };
  }

  min(length: number): ArraySchema<T> {
    const schema = new ArraySchema(this.itemSchema);
    schema.minLen = length;
    schema.maxLen = this.maxLen;
    return schema;
  }

  max(length: number): ArraySchema<T> {
    const schema = new ArraySchema(this.itemSchema);
    schema.minLen = this.minLen;
    schema.maxLen = length;
    return schema;
  }
}

type ObjectShape = Record<string, Schema<unknown>>;
type InferObject<T extends ObjectShape> = {
  [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
};

export class ObjectSchema<T extends ObjectShape> extends BaseSchema<InferObject<T>> {
  constructor(private shape: T) {
    super();
  }

  safeParse(input: unknown): ValidationResult<InferObject<T>> {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return {
        success: false,
        errors: [{ path: "", message: "Expected an object", code: "invalid_type" }],
      };
    }

    const errors: ValidationError[] = [];
    const data: Record<string, unknown> = {};
    const obj = input as Record<string, unknown>;

    for (const [key, schema] of Object.entries(this.shape)) {
      const result = schema.safeParse(obj[key]);
      if (result.success) {
        data[key] = result.data;
      } else {
        for (const err of result.errors) {
          errors.push({
            ...err,
            path: err.path ? `${key}.${err.path}` : key,
          });
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: data as InferObject<T> };
  }
}

export class EnumSchema<T extends string> extends BaseSchema<T> {
  constructor(private values: readonly T[]) {
    super();
  }

  safeParse(input: unknown): ValidationResult<T> {
    if (typeof input !== "string" || !this.values.includes(input as T)) {
      return {
        success: false,
        errors: [
          {
            path: "",
            message: `Expected one of: ${this.values.join(", ")}`,
            code: "invalid_enum",
          },
        ],
      };
    }
    return { success: true, data: input as T };
  }
}
