/* ============================================================
   ClassHub — Domain types
   Satu sumber kebenaran untuk bentuk data, selaras dengan
   supabase/schema.sql
   ============================================================ */

export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type RepeatType = 'none' | 'daily' | 'weekly'
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type FileCategory =
  | 'Materials'
  | 'Assignments'
  | 'Presentations'
  | 'Documents'
  | 'Other'

export const FILE_CATEGORIES: readonly FileCategory[] = [
  'Materials',
  'Assignments',
  'Presentations',
  'Documents',
  'Other',
] as const

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'completed'] as const
export const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high'] as const
export const REPEAT_TYPES: readonly RepeatType[] = ['none', 'daily', 'weekly'] as const

export const DAY_KEYS: readonly DayOfWeek[] = [
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
] as const

export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Senin',
  tue: 'Selasa',
  wed: 'Rabu',
  thu: 'Kamis',
  fri: 'Jumat',
  sat: 'Sabtu',
  sun: 'Minggu',
}

/* ------------------------------ Row shapes ------------------------------ */

export interface Profile {
  id: string
  full_name: string | null
  school: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Subject {
  id: string
  user_id: string
  name: string
  teacher: string | null
  room: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  subject_id: string | null
  deadline: string | null
  priority: TaskPriority
  status: TaskStatus
  attachment: string | null
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  user_id: string
  title: string
  description: string | null
  reminder_at: string
  repeat_type: RepeatType
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  user_id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  user_id: string
  subject_id: string | null
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  room: string | null
  teacher: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string | null
  content: string | null
  subject_id: string | null
  category: string | null
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface FileRow {
  id: string
  user_id: string
  name: string
  storage_path: string
  mime_type: string | null
  size: number | null
  subject_id: string | null
  category: FileCategory
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  user_id: string
  type: string | null
  action: string | null
  title: string | null
  created_at: string
}

/* ---------------------------- Insert payloads ---------------------------- */

export type SubjectInsert = Pick<Subject, 'name'> &
  Partial<Pick<Subject, 'teacher' | 'room' | 'color'>>

export type TaskInsert = Pick<Task, 'title'> &
  Partial<Pick<Task, 'description' | 'subject_id' | 'deadline' | 'priority' | 'status' | 'attachment'>>

export type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>

export type ReminderInsert = Pick<Reminder, 'title' | 'reminder_at'> &
  Partial<Pick<Reminder, 'description' | 'repeat_type' | 'is_completed'>>

export type ReminderUpdate = Partial<Omit<Reminder, 'id' | 'user_id' | 'created_at'>>

export type EventInsert = Pick<Event, 'title' | 'start_at'> &
  Partial<Pick<Event, 'description' | 'end_at' | 'location'>>

export type EventUpdate = Partial<Omit<Event, 'id' | 'user_id' | 'created_at'>>

export type ScheduleInsert = Pick<Schedule, 'day_of_week' | 'start_time' | 'end_time'> &
  Partial<Pick<Schedule, 'subject_id' | 'room' | 'teacher'>>

export type ScheduleUpdate = Partial<Omit<Schedule, 'id' | 'user_id' | 'created_at'>>

export type NoteInsert = Partial<Pick<Note, 'title' | 'content' | 'subject_id' | 'category'>>

export type NoteUpdate = Partial<Omit<Note, 'id' | 'user_id' | 'created_at'>>

/* ------------------------------ Derived views ------------------------------ */

export interface SubjectWithCounts extends Subject {
  task_count: number
  note_count: number
  file_count: number
  schedule_count: number
}

export type SearchResultGroup = 'tasks' | 'reminders' | 'notes' | 'subjects' | 'files' | 'events'

export interface SearchResult {
  id: string
  group: SearchResultGroup
  title: string
  subtitle: string | null
}

export interface DashboardData {
  tasks: Task[]
  reminders: Reminder[]
  events: Event[]
  schedules: Schedule[]
  notes: Note[]
  files: FileRow[]
  subjects: Subject[]
}

/* ----------------------------- App user shape ----------------------------- */

export interface AppUser {
  id: string
  email: string
  displayName: string
}

export interface FileRecord {
  id: string
  user_id: string
  name: string
  storage_path: string
  mime_type: string | null
  size: number
  subject_id: string | null
  category: string
  created_at: string
  updated_at: string
}
