export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";

export type TaskSortField =
  | "date"
  | "created_at"
  | "story_point"
  | "ticket_number"
  | "ticket_title";

export type TaskSortOrder = "asc" | "desc";

export type TaskTag = {
  id: string;
  name: string;
  color: string | null;
};

export type TaskListItem = {
  id: string;
  date: string;
  ticketNumber: string;
  ticketTitle: string;
  ticketDescription: string;
  storyPoint: number | null;
  dailyReport: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  tags: TaskTag[];
  attachmentsCount: number;
};

export type TaskDetail = TaskListItem & {
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    action: "CREATED" | "UPDATED" | "DELETED";
    changes: unknown;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
};

export type TaskGroup = {
  date: string;
  tasks: TaskListItem[];
};

export type TasksResponse = {
  data: TaskGroup[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
