# @fcuae/validator

A lightweight TypeScript data validation library with a fluent API.

## Installation

```bash
npm install @fcuae/validator
```

## Usage

```typescript
import * as v from "@fcuae/validator";

// Define a schema
const userSchema = v.object({
  name: v.string().min(1).max(100),
  email: v.string().email(),
  age: v.number().integer().min(0).max(150),
  role: v.enumType(["admin", "user", "guest"] as const),
  tags: v.array(v.string()).min(1),
  bio: v.string().optional(),
});

// Parse (throws on failure)
const user = userSchema.parse(inputData);

// Safe parse (returns result object)
const result = userSchema.safeParse(inputData);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.errors);
}
```

## API

### Schemas

| Function | Description |
|----------|-------------|
| `v.string()` | String validation |
| `v.number()` | Number validation |
| `v.boolean()` | Boolean validation |
| `v.array(schema)` | Array validation with item schema |
| `v.object(shape)` | Object validation with field schemas |
| `v.enumType(values)` | Enum string validation |

### String Methods

- `.min(n)` - Minimum length
- `.max(n)` - Maximum length
- `.regex(pattern)` - RegExp pattern match
- `.email()` - Email format validation
- `.optional()` - Allow undefined/null

### Number Methods

- `.min(n)` - Minimum value
- `.max(n)` - Maximum value
- `.integer()` - Must be an integer
- `.optional()` - Allow undefined/null

### Array Methods

- `.min(n)` - Minimum item count
- `.max(n)` - Maximum item count
- `.optional()` - Allow undefined/null

## Running Tests

```bash
npm test
```

## Building

```bash
npm run build
```

## License

MIT
