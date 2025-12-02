import {
  fetchAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '#controllers/users.controllers.js';
import express from 'express';
import { authenticate } from '#middleware/auth.middleware.js';
const router = express.Router();

// GET all users (public)
router.get('/', authenticate, fetchAllUsers);

// GET single user (public)
router.get('/:id', authenticate, getUserById);

// CREATE new user
// Note: user creation is currently handled via the auth sign-up flow
// (POST /api/auth/sign-up). This route is left unimplemented on purpose.

// UPDATE user (protected - requires authentication)
router.put('/:id', authenticate, updateUser);

// DELETE user (protected - requires authentication)
router.delete('/:id', authenticate, deleteUser);

export default router;
