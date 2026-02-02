/**
 * Authentication Service
 * 
 * Handles user registration, login, and JWT token management.
 * Supports multi-tenant authentication with tenant isolation.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { db, users, tenants } from '../db/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Types
export interface RegisterInput {
  tenantId: string;
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: 'rider' | 'driver';
}

export interface LoginInput {
  tenantId: string;
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  tenantId: string;
  userType: 'rider' | 'driver' | 'admin' | 'dispatcher';
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  userType: string;
  status: string;
  averageRating: string | null;
  totalRides: number | null;
  avatarUrl: string | null;
}

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const { tenantId, email, phone, password, firstName, lastName, userType } = input;

    // Verify tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      throw new AuthError('Invalid tenant', 'INVALID_TENANT');
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(users.email, email),
        eq(users.tenantId, tenantId)
      ),
    });

    if (existingUser) {
      throw new AuthError('User with this email already exists', 'USER_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const [newUser] = await db.insert(users).values({
      tenantId,
      email,
      phone,
      passwordHash,
      firstName,
      lastName,
      userType,
      status: 'pending_verification',
    }).returning();

    logger.info({ userId: newUser.id, email, tenantId }, 'User registered');

    // Generate tokens
    const tokens = this.generateTokens({
      userId: newUser.id,
      tenantId,
      userType,
      email,
    });

    return {
      user: this.toUserProfile(newUser),
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const { tenantId, email, password } = input;

    // Find user
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.email, email),
        eq(users.tenantId, tenantId)
      ),
    });

    if (!user || !user.passwordHash) {
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (user.status === 'suspended') {
      throw new AuthError('Account suspended', 'ACCOUNT_SUSPENDED');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    logger.info({ userId: user.id, email, tenantId }, 'User logged in');

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      tenantId,
      userType: user.userType,
      email,
    });

    return {
      user: this.toUserProfile(user),
      tokens,
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as TokenPayload & { type: string };
      
      if (payload.type !== 'access') {
        throw new AuthError('Invalid token type', 'INVALID_TOKEN');
      }

      return payload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthError('Token expired', 'TOKEN_EXPIRED');
      }
      throw new AuthError('Invalid token', 'INVALID_TOKEN');
    }
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, config.jwt.secret) as TokenPayload & { type: string };
      
      if (payload.type !== 'refresh') {
        throw new AuthError('Invalid token type', 'INVALID_TOKEN');
      }

      // Verify user still exists and is active
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });

      if (!user || user.status === 'suspended') {
        throw new AuthError('User not found or suspended', 'USER_NOT_FOUND');
      }

      // Generate new tokens
      return this.generateTokens({
        userId: user.id,
        tenantId: user.tenantId,
        userType: user.userType,
        email: user.email,
      });
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError('Invalid refresh token', 'INVALID_TOKEN');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string, tenantId: string): Promise<UserProfile | null> {
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId)
      ),
    });

    return user ? this.toUserProfile(user) : null;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    tenantId: string,
    updates: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      avatarUrl: string;
      preferredLanguage: string;
      fcmToken: string;
      apnsToken: string;
    }>
  ): Promise<UserProfile> {
    const [updatedUser] = await db.update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId)
      ))
      .returning();

    if (!updatedUser) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    return this.toUserProfile(updatedUser);
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    tenantId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId)
      ),
    });

    if (!user || !user.passwordHash) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthError('Current password is incorrect', 'INVALID_CREDENTIALS');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info({ userId }, 'Password changed');
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(
      { ...payload, type: 'access' },
      config.jwt.secret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    };
  }

  /**
   * Convert database user to profile response
   */
  private toUserProfile(user: typeof users.$inferSelect): UserProfile {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      status: user.status || 'pending_verification',
      averageRating: user.averageRating,
      totalRides: user.totalRides,
      avatarUrl: user.avatarUrl,
    };
  }
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

// Export singleton instance
export const authService = new AuthService();
