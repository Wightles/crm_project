export type UserRole = 'manager' | 'executor'

export type TaskStatus =
  | 'new'
  | 'in_progress'
  | 'in_review'
  | 'accepted'
  | 'rework'

export type Profile = {
  id: string
  full_name: string
  role: UserRole
  created_at: string
}

export type ConstructionObject = {
  id: string
  name: string
  address: string
  created_by: string
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  title: string
  description: string
  object_id: string
  assignee_id: string
  status: TaskStatus
  created_by: string
  created_at: string
  updated_at: string
}

export type TaskStatusHistory = {
  id: string
  task_id: string
  changed_by: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  comment: string | null
  changed_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Pick<Profile, 'id' | 'full_name' | 'role'>
        Update: Partial<Pick<Profile, 'full_name' | 'role'>>
        Relationships: []
      }
      construction_objects: {
        Row: ConstructionObject
        Insert: Pick<ConstructionObject, 'name' | 'address' | 'created_by'>
        Update: Partial<Pick<ConstructionObject, 'name' | 'address'>>
        Relationships: []
      }
      tasks: {
        Row: Task
        Insert: Pick<Task, 'title' | 'description' | 'object_id' | 'assignee_id' | 'created_by'>
        Update: Partial<Pick<Task, 'title' | 'description' | 'object_id' | 'assignee_id' | 'status'>>
        Relationships: []
      }
      task_status_history: {
        Row: TaskStatusHistory
        Insert: Pick<TaskStatusHistory, 'task_id' | 'changed_by' | 'from_status' | 'to_status' | 'comment'>
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      change_task_status: {
        Args: {
          p_task_id: string
          p_new_status: TaskStatus
          p_comment?: string
        }
        Returns: Task
      }
    }
    Enums: {
      user_role: UserRole
      task_status: TaskStatus
    }
    CompositeTypes: Record<string, never>
  }
}
