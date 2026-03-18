import type { TaskStatus } from "@/types/task";

export type DashboardStats = {
  totalTasks: number;
  todayTasks: number;
  thisWeekTasks: number;
  thisMonthTasks: number;
  totalStoryPoints: number;
  thisWeekStoryPoints: number;
  thisMonthStoryPoints: number;
  tasksByStatus: Record<TaskStatus, number>;
  recentTasks: Array<{
    id: string;
    date: string;
    ticketNumber: string;
    ticketTitle: string;
    status: TaskStatus;
  }>;
  tasksPerDay: Array<{
    date: string;
    count: number;
  }>;
};

export type ActiveAnnouncement = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};
