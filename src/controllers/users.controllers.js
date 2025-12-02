import logger from '#config/logger.js';
import {
  getAllUsers,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from '#services/users.services.js';
import { formatValidationError } from '#utils/format.js';
import {
  updateUserSchema,
  userIdSchema,
} from '#validations/users.validation.js';

// GET /api/users
export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Fetching all users from database');

    const allUsers = await getAllUsers();

    res.status(200).json({
      message: 'Users retrieved successfully',
      users: allUsers,
      count: allUsers.length,
    });
  } catch (error) {
    logger.error('Error in getAllUsers controller:', error);
    next(error);
  }
};

// GET /api/users/:id
export const getUserById = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse({ id: req.params.id });

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info('Fetching user by id', { id });

    const user = await getUserByIdService(id);

    if (!user) {
      logger.warn('User not found', { id });
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: 'User retrieved successfully',
      user,
    });
  } catch (error) {
    logger.error('Error in getUserById controller:', error);
    next(error);
  }
};

// PUT /api/users/:id
export const updateUser = async (req, res, next) => {
  try {
    // Validate id param
    const idResult = userIdSchema.safeParse({ id: req.params.id });
    if (!idResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idResult.error),
      });
    }

    const { id } = idResult.data;

    // Validate body
    const bodyResult = updateUserSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyResult.error),
      });
    }

    const updates = bodyResult.data;

    // Authorization: users can only update themselves; admins can update anyone
    const requesterId = req.user.id;
    const requesterRole = req.user.role || 'user';

    if (requesterRole !== 'admin' && requesterId !== id) {
      logger.warn('Forbidden user update attempt', {
        requesterId,
        requesterRole,
        targetId: id,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own account',
      });
    }

    // Only admins can change the role field
    if (updates.role && requesterRole !== 'admin') {
      logger.warn('Non-admin attempted to change role', {
        requesterId,
        targetId: id,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can change user roles',
      });
    }

    logger.info('Updating user', { id, requesterId, requesterRole });

    const updatedUser = await updateUserService(id, updates);

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      logger.warn('User not found during update', { id: req.params.id });
      return res.status(404).json({ error: 'User not found' });
    }

    logger.error('Error in updateUser controller:', error);
    next(error);
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req, res, next) => {
  try {
    // Validate id param
    const idResult = userIdSchema.safeParse({ id: req.params.id });
    if (!idResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idResult.error),
      });
    }

    const { id } = idResult.data;

    const requesterId = req.user.id;
    const requesterRole = req.user.role || 'user';

    // Authorization: users can delete only themselves; admins can delete anyone
    if (requesterRole !== 'admin' && requesterId !== id) {
      logger.warn('Forbidden user delete attempt', {
        requesterId,
        requesterRole,
        targetId: id,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own account',
      });
    }

    logger.info('Deleting user', { id, requesterId, requesterRole });

    await deleteUserService(id);

    return res.status(200).json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    if (error.message === 'User not found') {
      logger.warn('User not found during delete', { id: req.params.id });
      return res.status(404).json({ error: 'User not found' });
    }

    logger.error('Error in deleteUser controller:', error);
    next(error);
  }
};
