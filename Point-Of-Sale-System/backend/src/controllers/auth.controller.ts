import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { env } from '../config/env.js';

export const setupRequired = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    const count = parseInt(rows[0].count);
    res.json({ required: count === 0 });
  } catch (error) {
    next(error);
  }
};

export const setup = async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { rows: userCount } = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount[0].count) > 0) {
      return res.status(400).json({ message: 'Setup already completed' });
    }

    const { name, username, password, storeName, storeAddress, storePhone } = req.body;

    if (!name || !username || !password || !storeName) {
      return res.status(400).json({ message: 'Name, username, password, and store name are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows: userRows } = await client.query(
      'INSERT INTO users (name, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, username, role',
      [name, username, hashedPassword, 'owner']
    );

    const settings = {
      store_name: storeName,
      store_address: storeAddress,
      store_phone: storePhone,
    };

    for (const [key, value] of Object.entries(settings)) {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, value]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ user: userRows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = TRUE', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, accessToken });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: number };
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = TRUE', [decoded.id]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = rows[0];
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query('SELECT id, name, username, role, phone FROM users WHERE id = $1', [req.user?.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
};
