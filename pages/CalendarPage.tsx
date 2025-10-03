import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { DayType, CalendarDaySetting } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';
import Modal from '../components/Modal';

const DAY_TYPE_COLORS: Record<DayType, string> = {
  [DayType.WORKDAY]: 'bg-white hover:bg-sky-100',
  [DayType.WEEKEND]: 'bg-gray-200 text-gray-600 hover:bg-gray-300',
  [DayType.NATIONAL_HOLIDAY]: 'bg-red-100 text-red-800 hover:bg-red-200 border-l-4 border-red-400',
  [DayType.JOINT_LEAVE]: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-l-4 border-orange-400',
};

const INDICATOR_COLORS: Record<DayType, string> = {
    [DayType.WORKDAY]: 'bg-transparent', // No indicator for default workdays
    [DayType.WEEKEND]: 'bg-gray-500',
    [DayType.NATIONAL_HOLIDAY]: 'bg-red-500',
    [DayType.JOINT_LEAVE]: 'bg-orange-500',
};


const DAY_TYPE_LABELS: Record<DayType, string> = {
  [DayType.WORKDAY]: 'Hari Kerja',
  [DayType.WEEKEND]: 'Akhir Pekan',
  [DayType.NATIONAL_HOLIDAY]: 'Libur Nasional',
  [DayType.JOINT_LEAVE]: 'Cuti Bersama',
};

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DaySettingsModal: React.FC<{ day: Date; onClose: () => void }> = ({ day, onClose }) => {
    const { state, dispatch } = useAppContext();
    const dateString = toLocalDateString(day);

    const currentSetting = state.calendarSettings.find(s => s.date === dateString);
    const [dayType, setDayType] = useState<DayType>(currentSetting?.type || DayType.WORKDAY);
    const [description, setDescription] = useState(currentSetting?.description || '');

    const handleSave = () => {
        const setting: CalendarDaySetting = { date: dateString, type: dayType, description };
        dispatch({ type: 'SET_CALENDAR_DAY', payload: setting });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Pengaturan untuk ${day.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipe Hari</label>
                    <select
                        value={dayType}
                        onChange={(e) => setDayType(e.target.value as DayType)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        {Object.entries(DAY_TYPE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Keterangan (Opsional)</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="contoh: Hari Kemerdekaan"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
            </div>
            <div className="flex justify-end mt-6 space-x-2">
                <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Batal</button>
                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Simpan</button>
            </div>
        </Modal>
    );
};

const CalendarPage: React.FC = () => {
  const { state } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: (Date | null)[] = [];

    // Adjust firstDayOfMonth to be Sunday-indexed (0) if it's not already.
    const startDay = firstDayOfMonth === 0 ? 0 : firstDayOfMonth;

    for (let i = 0; i < startDay; i++) {
      grid.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push(new Date(year, month, i));
    }
    return grid;
  }, [month, year]);

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };
  
  const getDaySetting = (day: Date) => {
    const dateString = toLocalDateString(day);
    return state.calendarSettings.find(s => s.date === dateString);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeftIcon /></button>
        <h2 className="text-xl font-semibold text-gray-800">
          {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200"><ChevronRightIcon /></button>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
          <div key={day} className="text-center font-medium text-sm py-2 bg-gray-50 text-gray-600">{day}</div>
        ))}
        {calendarGrid.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="bg-gray-50"></div>;
          
          const setting = getDaySetting(day);
          const dayOfWeek = day.getDay();
          const defaultType = (dayOfWeek === 0 || dayOfWeek === 6) ? DayType.WEEKEND : DayType.WORKDAY;
          const dayType = setting?.type || defaultType;
          const colorClass = DAY_TYPE_COLORS[dayType];
          const isSpecialHoliday = dayType === DayType.NATIONAL_HOLIDAY || dayType === DayType.JOINT_LEAVE;
          
          return (
            <div
              key={day.toString()}
              onClick={() => setSelectedDay(day)}
              className={`relative h-24 flex flex-col cursor-pointer transition-colors duration-150 ${colorClass} ${isSpecialHoliday ? 'pl-1 pr-2 py-2' : 'p-2'}`}
            >
              <div className="flex justify-between items-start">
                  <span className={`font-semibold text-black text-xl ${setting?.description ? 'underline decoration-dotted decoration-2' : ''}`}>
                    {day.getDate()}
                  </span>
                  {/* Show indicator only if a specific setting is applied */}
                  {setting && <div className={`w-2 h-2 mt-1.5 rounded-full ${INDICATOR_COLORS[setting.type]}`}></div>}
              </div>

              {setting?.description && (
                  <span className="text-xs mt-1 text-gray-700 truncate" title={setting.description}>
                      {setting.description}
                  </span>
              )}
            </div>
          );
        })}
      </div>

       <div className="mt-6 flex flex-wrap gap-4">
        {Object.entries(DAY_TYPE_LABELS).map(([key, label]) => {
            const dayTypeKey = key as DayType;
            let legendClasses = DAY_TYPE_COLORS[dayTypeKey];
            if (dayTypeKey === DayType.WORKDAY) {
                legendClasses += ' border border-gray-300'; // Make white box visible
            }
            return (
              <div key={key} className="flex items-center">
                <div className={`w-4 h-4 rounded-sm mr-2 ${legendClasses}`}></div>
                <span className="text-sm text-gray-600">{label}</span>
              </div>
            )
        })}
      </div>

      {selectedDay && <DaySettingsModal day={selectedDay} onClose={() => setSelectedDay(null)} />}
    </div>
  );
};

export default CalendarPage;