// Pure RBAC predicates — safe to import on both client and server.
// No next/headers or DB imports here, so client components can use them too.
import type { UserRole } from './types';

interface RoleHolder { role: UserRole | string }

const has = (user: RoleHolder | null | undefined, roles: UserRole[]) =>
  !!user && roles.includes(user.role as UserRole);

/** Sửa nội dung khảo sát / phân tích / backlog của dự án */
export const canEdit = (user: RoleHolder | null | undefined) =>
  has(user, ['admin', 'ba', 'manager']);

/** Freeze toàn bộ dự án (chốt yêu cầu) */
export const canFreeze = (user: RoleHolder | null | undefined) =>
  has(user, ['admin', 'manager']);

/** Duyệt Change Request */
export const canApproveCR = (user: RoleHolder | null | undefined) =>
  has(user, ['admin', 'manager']);

/** Quản lý người dùng */
export const canManageUsers = (user: RoleHolder | null | undefined) =>
  has(user, ['admin']);

/** Cấu hình AI provider/API key */
export const canConfigureAI = (user: RoleHolder | null | undefined) =>
  has(user, ['admin']);

/** Tạo / xóa dự án */
export const canManageProjects = (user: RoleHolder | null | undefined) =>
  has(user, ['admin', 'ba', 'manager']);

/** Xuất tài liệu BRD */
export const canExportBRD = (user: RoleHolder | null | undefined) =>
  has(user, ['admin', 'ba', 'manager']);
