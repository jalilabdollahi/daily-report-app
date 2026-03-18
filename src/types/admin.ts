import type { TaskStatus } from "@/types/task";

export type AdminStats = {
  users: {
    total: number;
    admins: number;
    members: number;
    active: number;
    inactive: number;
    neverLoggedIn: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  tasks: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    totalStoryPoints: number;
    done: number;
    blocked: number;
    flagged: number;
  };
  activity: {
    today: number;
    last7Days: number;
    failedLogins7Days: number;
  };
  announcements: {
    active: number;
  };
  storageUsedBytes: number;
  topUsers: Array<{
    id: string;
    name: string;
    email: string;
    taskCount: number;
    storyPoints: number;
  }>;
  registrationsPerDay: Array<{
    date: string;
    count: number;
  }>;
  tasksPerDay: Array<{
    date: string;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    ipAddress: string | null;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "USER";
    isActive: boolean;
    createdAt: string;
    lastLogin: string | null;
    taskCount: number;
  }>;
  usersNeedingAttention: Array<{
    id: string;
    name: string;
    email: string;
    reason: string;
    createdAt: string;
    lastLogin: string | null;
    isActive: boolean;
  }>;
};

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  avatarUrl: string | null;
  taskCount: number;
  createdAt: string;
  lastLogin: string | null;
};

export type AdminUsersSummary = {
  total: number;
  admins: number;
  members: number;
  active: number;
  inactive: number;
  neverLoggedIn: number;
  withTasks: number;
  withoutTasks: number;
};

export type AdminUserDetail = AdminUserListItem & {
  totalStoryPoints: number;
  lastActiveAt: string | null;
  recentTasks: Array<{
    id: string;
    date: string;
    ticketNumber: string;
    ticketTitle: string;
    status: TaskStatus;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    createdAt: string;
    metadata: unknown;
  }>;
};

export type AdminActivityItem = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  metadata: unknown;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type AdminActivitySummary = {
  total: number;
  uniqueActors: number;
  taskEvents: number;
  authEvents: number;
  failedLogins: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
};

export type AdminContentTask = {
  id: string;
  date: string;
  ticketNumber: string;
  ticketTitle: string;
  storyPoint: number | null;
  status: TaskStatus;
  flagged: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export type AdminTaskDetail = AdminContentTask & {
  ticketDescription: string;
  dailyReport: string;
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
};

export type AdminHealth = {
  database: {
    status: "healthy" | "degraded";
    responseTimeMs: number;
    sizeBytes: number | null;
  };
  api: {
    status: "healthy" | "degraded";
    avgResponseTimeMs: number;
  };
  storageUsedBytes: number;
  activeSessions: number;
  uptimeSeconds: number;
  environment: string;
  nodeVersion: string;
  nextVersion: string;
  lastDeploymentAt: string | null;
  recentErrors: Array<{
    id: string;
    message: string;
    createdAt: string;
  }>;
};

export type AdminAnnouncement = {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
  admin: {
    id: string;
    name: string;
  };
};
