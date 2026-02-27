const { z } = require('zod');

const mockAuthSchema = z.object({
  userId: z.string().trim().min(1).max(64),
});

const textSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    const error = new Error('Validation error');
    error.type = 'validation';
    error.errors = errors;
    throw error;
  }
  return result.data;
}

module.exports = {
  mockAuthSchema,
  textSchema,
  feedQuerySchema,
  validate,
};