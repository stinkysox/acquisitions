import bcrypt from 'bcryptjs';
import logger from '#config/logger.js';
import { eq } from 'drizzle-orm';
import { db } from '#config/database.js';
import { users } from '#models/user.model.js';

// 🔐 Hash password
export const hashedPassword = async password => {
  try {
    return await bcrypt.hash(password, 10); // salt rounds
  } catch (error) {
    logger.error(`Error hashing password: ${error}`);
    throw new Error('Password hashing failed');
  }
};

// 🔍 Compare password during login
export const comparePassword = async (password, hashedPasswordValue) => {
  try {
    return await bcrypt.compare(password, hashedPasswordValue); // true/false
  } catch (error) {
    logger.error(`Error comparing password: ${error}`);
    throw new Error('Password comparison failed');
  }
};

// 🆕 Create User in DB
export const createUser = async ({ name, email, password, role = 'user' }) => {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length) throw new Error('User already exists');

    const hash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hash,
      })
      .returning();

    return newUser;
  } catch (err) {
    console.error('DB ERROR:', err); // gives real reason
    throw new Error('User creation failed');
  }
};

// 🔐 Authenticate user with email and password
export const authenticateUser = async ({ email, password }) => {
  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = existingUser[0];

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    logger.info(`User authenticated with email: ${email}`);
    return user;
  } catch (error) {
    // Preserve specific auth error so controller can map to 401
    if (error.message === 'Invalid email or password') {
      throw error;
    }

    logger.error(`Error authenticating user: ${error}`);
    throw new Error('User authentication failed');
  }
};
