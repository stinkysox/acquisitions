import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { users } from '#models/user.model.js';
import { eq } from 'drizzle-orm';

// Read: all users (no password field)
export const getAllUsers = async () => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users);

    return allUsers;
  } catch (err) {
    logger.error('DB ERROR in getAllUsers:', err);
    throw new Error('Failed to retrieve users');
  }
};

// Read: single user by id (no password field)
export const getUserById = async id => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user || null;
  } catch (err) {
    logger.error('DB ERROR in getUserById:', err);
    throw new Error('Failed to retrieve user');
  }
};

// Update: user fields by id
export const updateUser = async (id, updates) => {
  try {
    // Ensure the user exists first
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      throw new Error('User not found');
    }

    const [updated] = await db
      .update(users)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        created_at: users.created_at,
        updated_at: users.updated_at,
      });

    return updated;
  } catch (err) {
    if (err.message === 'User not found') {
      // Propagate specific not-found error for controllers to handle
      throw err;
    }

    logger.error('DB ERROR in updateUser:', err);
    throw new Error('Failed to update user');
  }
};

// Delete: user by id
export const deleteUser = async id => {
  try {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!result.length) {
      throw new Error('User not found');
    }

    return result[0];
  } catch (err) {
    if (err.message === 'User not found') {
      throw err;
    }

    logger.error('DB ERROR in deleteUser:', err);
    throw new Error('Failed to delete user');
  }
};
