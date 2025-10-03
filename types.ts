export interface Teacher {
  id: string;
  name: string;
  subject: string;
  profilePicture?: string;
  workDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
}

export enum DayType {
  WORKDAY = 'WORKDAY',
  WEEKEND = 'WEEKEND',
  NATIONAL_HOLIDAY = 'NATIONAL_HOLIDAY',
  JOINT_LEAVE = 'JOINT_LEAVE',
}

export interface CalendarDaySetting {
  date: string; // YYYY-MM-DD
  type: DayType;
  description?: string;
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  SICK = 'SICK',
  PERMIT = 'PERMIT',
  ABSENT = 'ABSENT',
}

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
}