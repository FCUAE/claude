import * as v from "./index";
import { ValidationFailedError } from "./errors";

describe("string schema", () => {
  it("parses valid strings", () => {
    expect(v.string().parse("hello")).toBe("hello");
  });

  it("rejects non-strings", () => {
    const result = v.string().safeParse(42);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].code).toBe("invalid_type");
    }
  });

  it("validates min length", () => {
    const schema = v.string().min(3);
    expect(schema.parse("abc")).toBe("abc");

    const result = schema.safeParse("ab");
    expect(result.success).toBe(false);
  });

  it("validates max length", () => {
    const schema = v.string().max(5);
    expect(schema.parse("hello")).toBe("hello");

    const result = schema.safeParse("toolong");
    expect(result.success).toBe(false);
  });

  it("validates regex pattern", () => {
    const schema = v.string().regex(/^[a-z]+$/);
    expect(schema.parse("abc")).toBe("abc");

    const result = schema.safeParse("ABC");
    expect(result.success).toBe(false);
  });

  it("validates email", () => {
    const schema = v.string().email();
    expect(schema.parse("user@example.com")).toBe("user@example.com");

    const result = schema.safeParse("not-an-email");
    expect(result.success).toBe(false);
  });

  it("chains multiple validations", () => {
    const schema = v.string().min(5).max(10).email();
    const result = schema.safeParse("a@b");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("number schema", () => {
  it("parses valid numbers", () => {
    expect(v.number().parse(42)).toBe(42);
  });

  it("rejects non-numbers", () => {
    const result = v.number().safeParse("42");
    expect(result.success).toBe(false);
  });

  it("rejects NaN", () => {
    const result = v.number().safeParse(NaN);
    expect(result.success).toBe(false);
  });

  it("validates min value", () => {
    const schema = v.number().min(10);
    expect(schema.parse(10)).toBe(10);

    const result = schema.safeParse(5);
    expect(result.success).toBe(false);
  });

  it("validates max value", () => {
    const schema = v.number().max(100);
    expect(schema.parse(100)).toBe(100);

    const result = schema.safeParse(101);
    expect(result.success).toBe(false);
  });

  it("validates integer", () => {
    const schema = v.number().integer();
    expect(schema.parse(42)).toBe(42);

    const result = schema.safeParse(3.14);
    expect(result.success).toBe(false);
  });
});

describe("boolean schema", () => {
  it("parses valid booleans", () => {
    expect(v.boolean().parse(true)).toBe(true);
    expect(v.boolean().parse(false)).toBe(false);
  });

  it("rejects non-booleans", () => {
    const result = v.boolean().safeParse("true");
    expect(result.success).toBe(false);
  });
});

describe("array schema", () => {
  it("parses valid arrays", () => {
    const schema = v.array(v.number());
    expect(schema.parse([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("rejects non-arrays", () => {
    const schema = v.array(v.string());
    const result = schema.safeParse("not an array");
    expect(result.success).toBe(false);
  });

  it("validates item types", () => {
    const schema = v.array(v.number());
    const result = schema.safeParse([1, "two", 3]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].path).toBe("[1]");
    }
  });

  it("validates min length", () => {
    const schema = v.array(v.string()).min(2);
    const result = schema.safeParse(["one"]);
    expect(result.success).toBe(false);
  });

  it("validates max length", () => {
    const schema = v.array(v.string()).max(2);
    const result = schema.safeParse(["a", "b", "c"]);
    expect(result.success).toBe(false);
  });
});

describe("object schema", () => {
  it("parses valid objects", () => {
    const schema = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = schema.parse({ name: "Alice", age: 30 });
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  it("rejects non-objects", () => {
    const schema = v.object({ name: v.string() });
    const result = schema.safeParse("not an object");
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    const schema = v.object({ name: v.string() });
    const result = schema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("validates field types", () => {
    const schema = v.object({
      name: v.string(),
      age: v.number(),
    });

    const result = schema.safeParse({ name: 42, age: "thirty" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBe(2);
      expect(result.errors.map((e) => e.path).sort()).toEqual(["age", "name"]);
    }
  });

  it("supports nested objects", () => {
    const schema = v.object({
      user: v.object({
        name: v.string(),
        email: v.string().email(),
      }),
    });

    const result = schema.safeParse({
      user: { name: "Alice", email: "not-email" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].path).toBe("user.email");
    }
  });
});

describe("enum schema", () => {
  it("parses valid enum values", () => {
    const schema = v.enumType(["red", "green", "blue"] as const);
    expect(schema.parse("red")).toBe("red");
  });

  it("rejects invalid enum values", () => {
    const schema = v.enumType(["red", "green", "blue"] as const);
    const result = schema.safeParse("yellow");
    expect(result.success).toBe(false);
  });
});

describe("optional schema", () => {
  it("accepts undefined", () => {
    const schema = v.string().optional();
    const result = schema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });

  it("accepts null as undefined", () => {
    const schema = v.string().optional();
    const result = schema.safeParse(null);
    expect(result.success).toBe(true);
  });

  it("still validates present values", () => {
    const schema = v.string().optional();
    const result = schema.safeParse(42);
    expect(result.success).toBe(false);
  });
});

describe("parse (throwing)", () => {
  it("throws ValidationFailedError on failure", () => {
    expect(() => v.string().parse(42)).toThrow(ValidationFailedError);
  });

  it("error contains validation details", () => {
    try {
      v.string().parse(42);
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationFailedError);
      const validationErr = err as ValidationFailedError;
      expect(validationErr.errors.length).toBe(1);
      expect(validationErr.errors[0].code).toBe("invalid_type");
    }
  });
});
