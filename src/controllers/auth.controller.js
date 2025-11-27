import logger from '#config/logger.js';
import { formatValidationError } from '#utils/format.js';
import { signUpSchema, signInSchema } from '#validations/auth.validation.js';
import { authenticateUser, createUser } from '#services/auth.service.js';
import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';

export const signup = async (req, res, next) => {
  try {
    const validationResult = signUpSchema.safeParse(req.body);

    // ❗ Handle validation failure
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { name, email, password, role } = validationResult.data;

    const user = await createUser({ name, email, password, role });

    const token = jwttoken.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set(res, 'token', token);

    logger.info('User registered successfully:', email);

    // ❗ Correct JSON response structure
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name,
        email,
        role,
      },
    });
  } catch (error) {
    logger.error('Error in signup controller:', error);

    if (error.message === 'User with this email already exists') {
      return res.status(409).json({ error: error.message });
    }

    next(error);
  }
};

export const signin = async (req, res, next) => {
  try {
    const validationResult = signInSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { email, password } = validationResult.data;

    const user = await authenticateUser({ email, password });

    const token = jwttoken.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set(res, 'token', token);

    logger.info('User signed in successfully:', email);

    return res.status(200).json({
      message: 'User signed in successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error in signin controller:', error);

    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: error.message });
    }

    next(error);
  }
};

export const signout = async (req, res, next) => {
  try {
    cookies.clear(res, 'token');

    logger.info('User signed out successfully');

    return res.status(200).json({
      message: 'User signed out successfully',
    });
  } catch (error) {
    logger.error('Error in signout controller:', error);
    next(error);
  }
};
