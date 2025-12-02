import { z } from 'zod';

// Validate URL/path params that contain a user id
// Usage example: userIdSchema.safeParse({ id: req.params.id })
export const userIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Validate payload for updating a user
// All fields are optional, but at least one must be provided
export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(255).trim().optional(),
    email: z.email().max(255).toLowerCase().trim().optional(),
    password: z.string().min(8).max(128).optional(),
    role: z.enum(['user', 'admin']).optional(),
  })
  .refine(
    data =>
      data.name !== undefined ||
      data.email !== undefined ||
      data.password !== undefined ||
      data.role !== undefined,
    {
      message:
        'At least one field (name, email, password, role) must be provided',
      path: ['_'],
    }
  );
