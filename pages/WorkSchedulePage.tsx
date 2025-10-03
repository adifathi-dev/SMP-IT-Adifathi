import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Teacher } from '../types';

const daysOfWeek = [
  { label: 'Min', value: 0 },
  { label: 'Sen', value: 1 },
  { label: 'Sel', value: 2 },
  { label: 'Rab', value: 3 },
  { label: 'Kam', value: 4 },
  { label: 'Jum', value: 5 },
  { label: 'Sab', value: 6 },
];

const WorkSchedulePage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [schedules, setSchedules] = useState<Teacher[]>([]);

  useEffect(() => {
    // Deep copy to prevent direct mutation of global state
    setSchedules(JSON.parse(JSON.stringify(state.teachers)));
  }, [state.teachers]);

  const handleScheduleChange = (teacherId: string, dayValue: number, isChecked: boolean) => {
    setSchedules(prevSchedules =>
      prevSchedules.map(teacher => {
        if (teacher.id === teacherId) {
          let newWorkDays = [...teacher.workDays];
          if (isChecked) {
            if (!newWorkDays.includes(dayValue)) {
              newWorkDays.push(dayValue);
            }
          } else {
            newWorkDays = newWorkDays.filter(day => day !== dayValue);
          }
          newWorkDays.sort((a, b) => a - b);
          return { ...teacher, workDays: newWorkDays };
        }
        return teacher;
      })
    );
  };

  const handleSaveSchedules = () => {
    schedules.forEach(teacher => {
        // To optimize, we could compare with original state, but for simplicity
        // and given the small scale, dispatching all is acceptable.
        dispatch({
            type: 'UPDATE_TEACHER_SCHEDULE',
            payload: { teacherId: teacher.id, workDays: teacher.workDays },
        });
    });
    alert('Jadwal kerja berhasil disimpan!');
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">Atur Jadwal Kerja Guru</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nama Guru</th>
              {daysOfWeek.map(day => (
                <th key={day.value} className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">{day.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {schedules.map(teacher => (
              <tr key={teacher.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.name}</td>
                {daysOfWeek.map(day => (
                  <td key={day.value} className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                      checked={teacher.workDays.includes(day.value)}
                      onChange={(e) => handleScheduleChange(teacher.id, day.value, e.target.checked)}
                      aria-label={`Jadwal kerja untuk ${teacher.name} pada hari ${day.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
         {schedules.length === 0 && <p className="text-center py-10 text-gray-500">Tidak ada guru yang ditemukan. Silakan tambahkan guru di halaman 'Data Guru'.</p>}
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSaveSchedules}
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
        >
          Simpan Jadwal
        </button>
      </div>
    </div>
  );
};

export default WorkSchedulePage;