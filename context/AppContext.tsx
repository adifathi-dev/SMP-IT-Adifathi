import React, { createContext, useReducer, useContext, useEffect, ReactNode } from 'react';
import { Teacher, AttendanceRecord, CalendarDaySetting, DayType } from '../types';

interface AppState {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  calendarSettings: CalendarDaySetting[];
}

type Action =
  | { type: 'ADD_TEACHER'; payload: Teacher }
  | { type: 'UPDATE_TEACHER'; payload: Teacher }
  | { type: 'DELETE_TEACHER'; payload: string } // id
  | { type: 'SET_CALENDAR_DAY'; payload: CalendarDaySetting }
  | { type: 'UPSERT_ATTENDANCE'; payload: AttendanceRecord[] }
  | { type: 'UPDATE_TEACHER_SCHEDULE'; payload: { teacherId: string; workDays: number[] } };


const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialTeachers: Teacher[] = [
  { id: 't-1', name: 'Ahmad Fauzi', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Ahmad%20Fauzi', workDays: [1,2,3,4,5] },
  { id: 't-2', name: 'Budi Santoso', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Budi%20Santoso', workDays: [1,2,3,4,5] },
  { id: 't-3', name: 'Cecep Maulana', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Cecep%20Maulana', workDays: [1,2,3,4,5] },
  { id: 't-4', name: 'Dewi Lestari', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Dewi%20Lestari', workDays: [1,2,3,4,5] },
  { id: 't-5', name: 'Eka Fitriani', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Eka%20Fitriani', workDays: [1,2,3,4,5] },
  { id: 't-6', name: 'Fitri Handayani', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Fitri%20Handayani', workDays: [1,2,3,4,5] },
  { id: 't-7', name: 'Gita Permata', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Gita%20Permata', workDays: [1,2,3,4,5] },
  { id: 't-8', name: 'Hesti Wulandari', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Hesti%20Wulandari', workDays: [1,2,3,4,5] },
  { id: 't-9', name: 'Indah Purnamasari', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Indah%20Purnamasari', workDays: [1,2,3,4,5] },
  { id: 't-10', name: 'Joko Prasetyo', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Joko%20Prasetyo', workDays: [1,2,3,4,5] },
  { id: 't-11', name: 'Kartono', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Kartono', workDays: [1,2,3,4,5] },
  { id: 't-12', name: 'Lia Agustina', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Lia%20Agustina', workDays: [1,2,3,4,5] },
  { id: 't-13', name: 'Muhammad Rizki', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Muhammad%20Rizki', workDays: [1,2,3,4,5] },
  { id: 't-14', name: 'Nurhidayat', subject: 'Belum diatur', profilePicture: 'https://api.dicebear.com/8.x/initials/svg?seed=Nurhidayat', workDays: [1,2,3,4,5] },
];

const initialState: AppState = {
  teachers: [],
  attendanceRecords: [],
  calendarSettings: [],
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_TEACHER':
      return { ...state, teachers: [...state.teachers, action.payload] };
    case 'UPDATE_TEACHER':
      return {
        ...state,
        teachers: state.teachers.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_TEACHER':
      return {
        ...state,
        teachers: state.teachers.filter((t) => t.id !== action.payload),
      };
    case 'SET_CALENDAR_DAY':
      const existingSettingIndex = state.calendarSettings.findIndex(
        (s) => s.date === action.payload.date
      );
      if (existingSettingIndex > -1) {
        const newSettings = [...state.calendarSettings];
        newSettings[existingSettingIndex] = action.payload;
        return { ...state, calendarSettings: newSettings };
      }
      return { ...state, calendarSettings: [...state.calendarSettings, action.payload] };
    case 'UPSERT_ATTENDANCE':
       const newRecords = [...state.attendanceRecords];
       action.payload.forEach(newRecord => {
           const index = newRecords.findIndex(r => r.id === newRecord.id);
           if (index !== -1) {
               newRecords[index] = newRecord;
           } else {
               newRecords.push(newRecord);
           }
       });
       return { ...state, attendanceRecords: newRecords };
     case 'UPDATE_TEACHER_SCHEDULE':
      return {
        ...state,
        teachers: state.teachers.map((t) =>
          t.id === action.payload.teacherId
            ? { ...t, workDays: action.payload.workDays }
            : t
        ),
      };
    default:
      return state;
  }
};

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

const getInitialState = (): AppState => {
    try {
        const storedState = localStorage.getItem('attendanceApp');
        if (storedState) {
            const parsed = JSON.parse(storedState);
             // Simple migration: if old data without workDays exists, add default workDays
            if (parsed.teachers && parsed.teachers.length > 0 && parsed.teachers[0].workDays === undefined) {
                parsed.teachers = parsed.teachers.map((t: Omit<Teacher, 'workDays'>) => ({
                    ...t,
                    workDays: [1, 2, 3, 4, 5], // Default Mon-Fri
                }));
            }
            if (parsed.teachers && parsed.teachers.length > 0) {
                 return parsed;
            }
        }

        // Setup default weekends for the next year if no state exists
        const today = new Date();
        const year = today.getFullYear();
        const calendarSettings: CalendarDaySetting[] = [];
        for (let month = 0; month < 12; month++) {
            for (let day = 1; day <= 31; day++) {
                const date = new Date(year, month, day);
                if (date.getMonth() !== month) continue; // Skip invalid dates
                
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
                    calendarSettings.push({
                        date: toLocalDateString(date),
                        type: DayType.WEEKEND,
                    });
                }
            }
        }
        
        return { ...initialState, teachers: initialTeachers, calendarSettings };

    } catch (error) {
        console.error("Could not read from localStorage", error);
        return { ...initialState, teachers: initialTeachers, calendarSettings: [] };
    }
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, getInitialState());

  useEffect(() => {
    try {
      localStorage.setItem('attendanceApp', JSON.stringify(state));
    } catch (error) {
      console.error("Could not write to localStorage", error);
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};