/**
 * lib/subscription.ts — Subscription approval workflow
 * ===================================================
 * Handles user subscription requests, owner approvals, expirations.
 */

import { db } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type SubscriptionPlan = 'week' | 'month' | 'quarter' | 'half_year' | 'year' | 'lifetime';

export interface PlanInfo {
  id: SubscriptionPlan;
  label: string;
  days: number | null; // null = lifetime
  price: number;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: PlanInfo[] = [
  { id: 'week',      label: 'أسبوع',         days: 7,                 price: 25  },
  { id: 'month',     label: 'شهر',          days: 30,                price: 100, popular: true },
  { id: 'quarter',   label: '3 أشهر',        days: 90,                price: 250 },
  { id: 'half_year', label: '6 أشهر',        days: 180,               price: 450 },
  { id: 'year',      label: 'سنة',          days: 365,               price: 800 },
  { id: 'lifetime',  label: 'مدى الحياة',    days: null,             price: 2000 },
];

export function getPlanInfo(plan: SubscriptionPlan): PlanInfo | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === plan);
}

export function getPlanEndDate(plan: SubscriptionPlan, from: Date = new Date()): Date | null {
  const info = getPlanInfo(plan);
  if (!info || info.days === null) return null;  // lifetime
  return new Date(from.getTime() + info.days * 24 * 60 * 60 * 1000);
}

/**
 * Check if user has active subscription (approved + not expired)
 */
export function isSubscriptionActive(user: { accountStatus: string; subscriptionEndsAt: Date | null; role: string }): boolean {
  if (user.role === 'owner' || user.role === 'admin') return true;
  if (user.accountStatus !== 'approved') return false;
  if (!user.subscriptionEndsAt) return false;
  return user.subscriptionEndsAt.getTime() > Date.now();
}

/**
 * Find expired subscriptions and mark them as expired.
 * Run this on cron or middleware periodically.
 */
export async function expireOldSubscriptions(): Promise<number> {
  const result = await db.user.updateMany({
    where: {
      accountStatus: 'approved',
      subscriptionEndsAt: { lt: new Date() },
      role: { notIn: ['owner', 'admin'] },
    },
    data: { accountStatus: 'expired' as AccountStatus },
  });
  return result.count;
}

/**
 * Owner approves a pending user with a chosen plan.
 */
export async function approveUser(opts: {
  userId: string;
  owner: AuthUser;
  plan: SubscriptionPlan;
}): Promise<{ ok: boolean; message: string; endsAt?: Date | null }> {
  const { userId, owner, plan } = opts;
  const endsAt = getPlanEndDate(plan);
  const planInfo = getPlanInfo(plan);

  if (!planInfo) return { ok: false, message: 'خطة غير صالحة' };

  await db.user.update({
    where: { id: userId },
    data: {
      accountStatus: 'approved',
      subscriptionPlan: plan,
      subscriptionEndsAt: endsAt,
      approvedAt: new Date(),
      approvedBy: owner.id,
      rejectionReason: null,
    },
  });

  // Log in audit
  await db.adminAuditLog.create({
    data: {
      actorId: owner.id,
      action: 'subscription.approve',
      targetId: userId,
      detail: `Approved user with plan ${planInfo.label} (${planInfo.days ?? 'lifetime'} days)`,
    },
  }).catch(() => {});

  return {
    ok: true,
    message: `تمت الموافقة على المستخدم مع خطة "${planInfo.label}". ينتهي الاشتراك: ${endsAt ? endsAt.toLocaleDateString('ar') : 'مدى الحياة'}`,
    endsAt,
  };
}

/**
 * Owner rejects a pending user with a reason.
 */
export async function rejectUser(opts: {
  userId: string;
  owner: AuthUser;
  reason?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { userId, owner, reason } = opts;

  await db.user.update({
    where: { id: userId },
    data: {
      accountStatus: 'rejected',
      rejectionReason: reason || null,
      approvedBy: owner.id,
    },
  });

  await db.adminAuditLog.create({
    data: {
      actorId: owner.id,
      action: 'subscription.reject',
      targetId: userId,
      detail: `Rejected user. Reason: ${reason || 'not specified'}`,
    },
  }).catch(() => {});

  return { ok: true, message: 'تم رفض المستخدم' };
}

/**
 * Owner revokes / cancels an active subscription.
 */
export async function revokeSubscription(opts: {
  userId: string;
  owner: AuthUser;
  reason?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { userId, owner, reason } = opts;

  await db.user.update({
    where: { id: userId },
    data: {
      accountStatus: 'expired',
      subscriptionEndsAt: new Date(),
      rejectionReason: reason || 'Subscription revoked by owner',
    },
  });

  await db.adminAuditLog.create({
    data: {
      actorId: owner.id,
      action: 'subscription.revoke',
      targetId: userId,
      detail: `Revoked subscription. Reason: ${reason || 'not specified'}`,
    },
  }).catch(() => {});

  return { ok: true, message: 'تم إلغاء الاشتراك' };
}

/**
 * Owner extends an existing subscription by a chosen plan.
 */
export async function extendSubscription(opts: {
  userId: string;
  owner: AuthUser;
  plan: SubscriptionPlan;
}): Promise<{ ok: boolean; message: string; endsAt?: Date | null }> {
  const { userId, owner, plan } = opts;

  // Get current user to check existing end date
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, message: 'المستخدم غير موجود' };

  // If user is currently active, extend from current end date; else from now
  const baseDate = (user.subscriptionEndsAt && user.subscriptionEndsAt.getTime() > Date.now())
    ? user.subscriptionEndsAt
    : new Date();

  const endsAt = getPlanEndDate(plan, baseDate);
  const planInfo = getPlanInfo(plan);

  await db.user.update({
    where: { id: userId },
    data: {
      accountStatus: 'approved',
      subscriptionPlan: plan,
      subscriptionEndsAt: endsAt,
    },
  });

  await db.adminAuditLog.create({
    data: {
      actorId: owner.id,
      action: 'subscription.extend',
      targetId: userId,
      detail: `Extended subscription with plan ${planInfo?.label}. New end: ${endsAt ?? 'lifetime'}`,
    },
  }).catch(() => {});

  return {
    ok: true,
    message: `تم تمديد الاشتراك بالخطة "${planInfo?.label}". ينتهي في: ${endsAt ? endsAt.toLocaleDateString('ar') : 'مدى الحياة'}`,
    endsAt,
  };
}

/**
 * Send a subscription request (when user signs up or requests subscription).
 * This sends the user's email to the developer via webhook/console log + DB activity log.
 */
export async function sendSubscriptionRequest(opts: {
  userId: string;
  userEmail?: string | null;
  userUsername?: string | null;
}): Promise<{ ok: boolean }> {
  const { userId, userEmail, userUsername } = opts;

  // Log to activity for owner to see in dashboard
  await db.activityLog.create({
    data: {
      action: 'subscription.request',
      detail: `New subscription request from ${userEmail || userUsername || 'unknown user'}`,
      category: 'subscription',
      severity: 'info',
      userId,
    },
  }).catch(() => {});

  // In production: also send to owner via:
  // - Email (SMTP)
  // - Telegram bot notification
  // - Webhook
  console.log(`📧 [SUBSCRIPTION REQUEST] New user signed up: ${userEmail || userUsername} (id: ${userId})`);
  console.log(`   → Owner should review at /admin/users`);

  return { ok: true };
}

/**
 * Get statistics for owner dashboard
 */
export async function getOwnerStats() {
  const [pending, approved, rejected, expired, totalUsers, totalAccounts, totalCommands] = await Promise.all([
    db.user.count({ where: { accountStatus: 'pending' } }),
    db.user.count({ where: { accountStatus: 'approved' } }),
    db.user.count({ where: { accountStatus: 'rejected' } }),
    db.user.count({ where: { accountStatus: 'expired' } }),
    db.user.count(),
    db.telegramAccount.count(),
    db.commandExecution.count(),
  ]);

  return {
    pending,
    approved,
    rejected,
    expired,
    totalUsers,
    totalAccounts,
    totalCommands,
  };
}
