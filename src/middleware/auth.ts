import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { verifyLocalToken } from '../lib/auth-utils.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export type UserRole = 'Administrator' | 'Kepala Sekolah' | 'Guru' | 'Wali Kelas';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  username: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  ptkId: number | null;
  assignedClass: string;
  assignedSubjects: string[];
  isActive: boolean;
}

export interface AuthRequest extends Request {
  appUser?: AuthenticatedUser;
}

async function getOrCreateFirebaseUser(uid: string, email: string, name?: string): Promise<AuthenticatedUser> {
  const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
  if (existing.length > 0) {
    const u = existing[0];
    return {
      id: u.id,
      uid: u.uid,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: u.role as UserRole,
      ptkId: u.ptkId,
      assignedClass: u.assignedClass || '',
      assignedSubjects: u.assignedSubjects || [],
      isActive: u.isActive,
    };
  }

  // Check if any Administrator exists yet; first Google user becomes Administrator
  const existingAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'Administrator'))
    .limit(1);

  const defaultRole: UserRole =
    existingAdmins.length === 0 || email.toLowerCase() === 'alvamkr@gmail.com'
      ? 'Administrator'
      : 'Guru';

  const result = await db
    .insert(users)
    .values({
      uid,
      email,
      fullName: name || email.split('@')[0],
      role: defaultRole,
      assignedClass: '',
      assignedSubjects: [],
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
      },
    })
    .returning();

  const u = result[0];
  return {
    id: u.id,
    uid: u.uid,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    role: u.role as UserRole,
    ptkId: u.ptkId,
    assignedClass: u.assignedClass || '',
    assignedSubjects: u.assignedSubjects || [],
    isActive: u.isActive,
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak: Token autentikasi tidak ditemukan.' });
  }

  const token = authHeader.split('Bearer ')[1];

  // 1. Check signed local credential token
  if (token.startsWith('local.')) {
    const payload = verifyLocalToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Sesi login telah berakhir atau tidak valid.' });
    }
    try {
      const found = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (found.length === 0 || !found[0].isActive) {
        return res.status(401).json({ error: 'Akun pengguna tidak ditemukan atau dinonaktifkan.' });
      }
      const u = found[0];
      req.appUser = {
        id: u.id,
        uid: u.uid,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        role: u.role as UserRole,
        ptkId: u.ptkId,
        assignedClass: u.assignedClass || '',
        assignedSubjects: u.assignedSubjects || [],
        isActive: u.isActive,
      };
      return next();
    } catch (error) {
      console.error('Database error during local auth verification:', error);
      return res.status(500).json({ error: 'Gagal memverifikasi sesi pengguna.' });
    }
  }

  // 2. Verify Firebase ID Token (Google Sign-In)
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email || `${decodedToken.uid}@school.local`;
    const appUser = await getOrCreateFirebaseUser(decodedToken.uid, email, decodedToken.name);
    if (!appUser.isActive) {
      return res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh Administrator.' });
    }
    req.appUser = appUser;
    return next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Token autentikasi tidak valid atau kedaluwarsa.' });
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.appUser) {
      return res.status(401).json({ error: 'Sesi pengguna tidak ditemukan.' });
    }
    if (!allowedRoles.includes(req.appUser.role)) {
      return res.status(403).json({
        error: `Akses ditolak. Fitur ini hanya dapat diakses oleh: ${allowedRoles.join(', ')}.`,
      });
    }
    return next();
  };
};
