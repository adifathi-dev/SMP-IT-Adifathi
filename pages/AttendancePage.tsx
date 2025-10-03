import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { DayType, AttendanceStatus, AttendanceRecord, Teacher, CalendarDaySetting } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, HeartPulseIcon, FileTextIcon, XCircleIcon, SettingsIcon, PrinterIcon } from '../components/Icons';
import Modal from '../components/Modal';

// --- HELPER FUNCTIONS ---

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromLocalDateString = (dateString: string): Date => {
  const parts = dateString.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // month is 0-indexed
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
};

// Checks if a given day is a workday for a specific teacher, considering global holidays and their personal schedule.
const isTeacherWorkDay = (teacher: Teacher, date: Date, calendarSettings: CalendarDaySetting[]): boolean => {
    const dateString = toLocalDateString(date);
    const setting = calendarSettings.find(s => s.date === dateString);
    const dayOfWeek = date.getDay();

    let dayType: DayType;

    if (setting) {
        dayType = setting.type;
    } else {
        dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? DayType.WEEKEND : DayType.WORKDAY;
    }

    if (dayType !== DayType.WORKDAY) {
        return false; // It's a global holiday or weekend
    }

    // Now check against the teacher's specific schedule
    return teacher.workDays.includes(dayOfWeek);
};


// Helper to handle image loading errors and fallback to a default avatar
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, teacherName: string) => {
    e.currentTarget.src = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(teacherName)}`;
};


// --- COMPONENT: MassAttendanceModal ---

const MassAttendanceModal: React.FC<{
  teachers: Teacher[];
  currentDate: Date;
  onClose: () => void;
}> = ({ teachers, currentDate, onClose }) => {
    const { state, dispatch } = useAppContext();
    const [startDate, setStartDate] = useState(toLocalDateString(currentDate));
    const [endDate, setEndDate] = useState(toLocalDateString(currentDate));
    const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
    const [checkIn, setCheckIn] = useState('07:00');
    const [checkOut, setCheckOut] = useState('15:00');
    const [selectedTeachers, setSelectedTeachers] = useState<string[]>(teachers.map(t => t.id));

    const handleTeacherToggle = (teacherId: string) => {
        setSelectedTeachers(prev =>
            prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedTeachers(checked ? teachers.map(t => t.id) : []);
    };

    const handleSubmit = () => {
        const recordsToUpsert: AttendanceRecord[] = [];
        const start = fromLocalDateString(startDate);
        const end = fromLocalDateString(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            selectedTeachers.forEach(teacherId => {
                const teacher = state.teachers.find(t => t.id === teacherId);
                // Apply attendance only if it's a scheduled workday for that specific teacher
                if (teacher && isTeacherWorkDay(teacher, new Date(d), state.calendarSettings)) {
                    const dateString = toLocalDateString(new Date(d));
                    recordsToUpsert.push({
                        id: `${teacherId}-${dateString}`,
                        teacherId,
                        date: dateString,
                        status,
                        checkIn: status === AttendanceStatus.PRESENT ? checkIn : undefined,
                        checkOut: status === AttendanceStatus.PRESENT ? checkOut : undefined,
                    });
                }
            });
        }
        
        if (recordsToUpsert.length > 0) {
            dispatch({ type: 'UPSERT_ATTENDANCE', payload: recordsToUpsert });
        }
        onClose();
    };


    return (
        <Modal isOpen={true} onClose={onClose} title="Input Absensi Massal">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Status Absensi</label>
                    <select value={status} onChange={e => setStatus(e.target.value as AttendanceStatus)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value={AttendanceStatus.PRESENT}>Hadir</option>
                        <option value={AttendanceStatus.SICK}>Sakit</option>
                        <option value={AttendanceStatus.PERMIT}>Izin</option>
                        <option value={AttendanceStatus.ABSENT}>Alpha</option>
                    </select>
                </div>
                {status === AttendanceStatus.PRESENT && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Waktu Hadir</label>
                            <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Waktu Pulang</label>
                            <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                        </div>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Guru</label>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
                        <div className="flex items-center border-b pb-2 mb-2">
                            <input type="checkbox" checked={selectedTeachers.length === teachers.length} onChange={e => handleSelectAll(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                            <label className="ml-2 block text-sm font-bold text-gray-900">Pilih Semua</label>
                        </div>
                        {teachers.map(teacher => (
                            <div key={teacher.id} className="flex items-center py-1">
                                <input type="checkbox" id={`teacher-${teacher.id}`} checked={selectedTeachers.includes(teacher.id)} onChange={() => handleTeacherToggle(teacher.id)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                                <label htmlFor={`teacher-${teacher.id}`} className="ml-2 flex items-center text-sm text-gray-700 cursor-pointer">
                                    <img 
                                        className="h-6 w-6 rounded-full object-cover mr-2" 
                                        src={teacher.profilePicture || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(teacher.name)}`} 
                                        alt={teacher.name}
                                        onError={(e) => handleImageError(e, teacher.name)}
                                    />
                                    {teacher.name}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end mt-6 space-x-2">
                <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Batal</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Terapkan Absensi</button>
            </div>
        </Modal>
    );
};

// --- COMPONENT: IndividualAttendanceModal ---

const IndividualAttendanceModal: React.FC<{
    teacher: Teacher;
    date: Date;
    record: AttendanceRecord | undefined;
    onClose: () => void
}> = ({ teacher, date, record, onClose }) => {
    const { dispatch } = useAppContext();
    const dateString = toLocalDateString(date);
    const [status, setStatus] = useState<AttendanceStatus>(record?.status || AttendanceStatus.PRESENT);
    const [checkIn, setCheckIn] = useState(record?.checkIn || '07:00');
    const [checkOut, setCheckOut] = useState(record?.checkOut || '15:00');

    const handleSubmit = () => {
        const newRecord: AttendanceRecord = {
            id: `${teacher.id}-${dateString}`,
            teacherId: teacher.id,
            date: dateString,
            status,
            checkIn: status === AttendanceStatus.PRESENT ? checkIn : undefined,
            checkOut: status === AttendanceStatus.PRESENT ? checkOut : undefined,
        };
        dispatch({ type: 'UPSERT_ATTENDANCE', payload: [newRecord] });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Perbarui Status untuk ${teacher.name}`}>
             <p className="mb-4 text-gray-600">Tanggal: {date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <select value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                <option value={AttendanceStatus.PRESENT}>Hadir</option>
                <option value={AttendanceStatus.SICK}>Sakit (S)</option>
                <option value={AttendanceStatus.PERMIT}>Izin (I)</option>
                <option value={AttendanceStatus.ABSENT}>Alpha (A)</option>
            </select>
             {status === AttendanceStatus.PRESENT && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Waktu Hadir</label>
                        <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Waktu Pulang</label>
                        <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                    </div>
                </div>
            )}
            <div className="flex justify-end mt-6 space-x-2">
                <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Batal</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Simpan</button>
            </div>
        </Modal>
    )
};


// --- COMPONENT: PrintSettingsModal ---
interface PrintSettings {
  title: string;
  schoolYear: string;
  city: string;
  principalName: string;
}

const PrintSettingsModal: React.FC<{
    currentSettings: PrintSettings;
    onSave: (settings: PrintSettings) => void;
    onClose: () => void;
    currentMonthYear: string;
}> = ({ currentSettings, onSave, onClose, currentMonthYear }) => {
    const [settings, setSettings] = useState(currentSettings);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(settings);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Atur Informasi Cetak">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Judul</label>
                    <input type="text" name="title" id="title" value={settings.title} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="schoolYear" className="block text-sm font-medium text-gray-700">Tahun Pelajaran</label>
                    <input type="text" name="schoolYear" id="schoolYear" value={settings.schoolYear} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Bulan dan Tahun</label>
                    <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-100 rounded-md">{currentMonthYear}</p>
                </div>
                 <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">Nama Kota</label>
                    <input type="text" name="city" id="city" value={settings.city} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="principalName" className="block text-sm font-medium text-gray-700">Kepala Sekolah</label>
                    <input type="text" name="principalName" id="principalName" value={settings.principalName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div className="flex justify-end pt-2 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Batal</button>
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Simpan</button>
                </div>
            </form>
        </Modal>
    );
};


// --- COMPONENT: PrintableView (for printing only) ---
const PrintableView: React.FC<{
    settings: PrintSettings,
    currentDate: Date,
    state: { teachers: Teacher[], calendarSettings: CalendarDaySetting[], attendanceRecords: AttendanceRecord[] },
    daysInMonth: number,
    getDayBackgroundColor: (date: Date) => string,
    getRecord: (teacherId: string, day: number) => AttendanceRecord | undefined,
    renderCellContent: (record: AttendanceRecord | undefined) => React.ReactNode,
    getSummary: (teacher: Teacher) => any,
}> = ({ settings, currentDate, state, daysInMonth, getDayBackgroundColor, getRecord, renderCellContent, getSummary }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const lastDayOfMonth = new Date(year, month + 1, 0);
    const formattedPrintDate = lastDayOfMonth.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="hidden print:block text-black font-sans">
             {/* Header */}
            <div className="text-center font-bold mb-6">
                <h1 className="text-lg uppercase">{settings.title}</h1>
                <h2 className="text-base uppercase">TAHUN PELAJARAN {settings.schoolYear}</h2>
                <h3 className="text-base uppercase">BULAN {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
            </div>

            {/* Table */}
            <table className="min-w-full border-collapse border border-gray-500 text-[10px]">
                 <thead>
                        <tr className="bg-gray-100 font-medium">
                            <th className="border border-gray-500 px-1 py-1" style={{width: '2%'}} rowSpan={2}>No</th>
                            <th className="border border-gray-500 px-2 py-1 text-left" style={{width: '15%'}} rowSpan={2}>Nama Guru</th>
                            <th className="border border-gray-500 px-2 py-1 text-left" style={{width: '12%'}} rowSpan={2}>Mata Pelajaran</th>
                            <th className="border border-gray-500 px-1 py-1" colSpan={daysInMonth}>Tanggal</th>
                            <th className="border border-gray-500 px-1 py-1" style={{width: '18%'}} colSpan={6}>Jumlah</th>
                        </tr>
                        <tr className="bg-gray-100 font-medium">
                           {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                <th key={day} className={`border border-gray-500 p-1 text-center font-normal ${getDayBackgroundColor(new Date(year, month, day))}`}>{day}</th>
                            ))}
                            <th className="border border-gray-500 p-1 bg-gray-200 font-semibold">Hari Kerja</th>
                            <th className="border border-gray-500 p-1 bg-blue-100 font-semibold">S</th>
                            <th className="border border-gray-500 p-1 bg-green-100 font-semibold">I</th>
                            <th className="border border-gray-500 p-1 bg-red-100 font-semibold">A</th>
                            <th className="border border-gray-500 p-1 bg-cyan-100 font-semibold">Hadir</th>
                            <th className="border border-gray-500 p-1 bg-purple-100 font-semibold">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {state.teachers.map((teacher, index) => {
                             const summary = getSummary(teacher);
                             return (
                                <tr key={teacher.id} className="text-center">
                                    <td className="border border-gray-500 px-1 py-1">{index + 1}</td>
                                    <td className="border border-gray-500 px-2 py-1 text-left whitespace-nowrap">{teacher.name}</td>
                                    <td className="border border-gray-500 px-2 py-1 text-left whitespace-nowrap">{teacher.subject}</td>
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                        const record = getRecord(teacher.id, day);
                                        const date = new Date(year, month, day);
                                        const isWorking = isTeacherWorkDay(teacher, date, state.calendarSettings);
                                        const bgColorClass = getDayBackgroundColor(date);
                                        return (
                                            <td key={day} className={`border border-gray-500 p-0.5 h-8 ${bgColorClass}`} style={{minWidth: '20px'}}>
                                                {isWorking ? renderCellContent(record) : ''}
                                            </td>
                                        )
                                    })}
                                    <td className="border border-gray-500 font-medium bg-gray-100">{summary.workDays}</td>
                                    <td className="border border-gray-500 font-medium bg-blue-50">{summary.S || ''}</td>
                                    <td className="border border-gray-500 font-medium bg-green-50">{summary.I || ''}</td>
                                    <td className="border border-gray-500 font-medium bg-red-50">{summary.A || ''}</td>
                                    <td className="border border-gray-500 font-medium bg-cyan-50">{summary.presentDays}</td>
                                    <td className="border border-gray-500 font-medium bg-purple-50">{summary.presencePercentage}</td>
                                </tr>
                             )
                        })}
                    </tbody>
            </table>
            
             {/* Footer Section */}
            <div className="mt-8 flex justify-between items-end text-sm">
                 {/* Legend */}
                <div className="text-xs">
                    <h4 className="font-bold mb-2">Keterangan</h4>
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center"><div className="w-4 h-4 mr-2 bg-white border border-gray-400"></div><span>Hari Kerja</span></div>
                        <div className="flex items-center"><div className="w-4 h-4 mr-2 bg-gray-400"></div><span>Akhir Pekan</span></div>
                        <div className="flex items-center"><div className="w-4 h-4 mr-2 bg-[#F7A5A5]"></div><span>Libur Nasional</span></div>
                        <div className="flex items-center"><div className="w-4 h-4 mr-2 bg-[#FFDBB6]"></div><span>Cuti Bersama</span></div>
                    </div>
                </div>

                {/* Signature */}
                <div className="text-center">
                    <p>{settings.city}, {formattedPrintDate}</p>
                    <p>Kepala Sekolah</p>
                    <div className="h-20"></div> {/* Spacer for signature */}
                    <p className="font-bold uppercase underline">{settings.principalName}</p>
                </div>
            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT: AttendancePage ---

const AttendancePage: React.FC = () => {
    const { state } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isMassModalOpen, setMassModalOpen] = useState(false);
    const [individualModalData, setIndividualModalData] = useState<{teacher: Teacher, date: Date} | null>(null);
    const [isPrintSettingsModalOpen, setPrintSettingsModalOpen] = useState(false);
    const [printSettings, setPrintSettings] = useState<PrintSettings>({
        title: 'DAFTAR HADIR GURU SMP IT ADIFATHI JATIWANGI',
        schoolYear: '2025/2026',
        city: 'Majalengka',
        principalName: 'KOMARUDIN, S.Pd.I'
    });

     useEffect(() => {
        try {
            const saved = localStorage.getItem('attendancePrintSettings');
            if (saved) {
                setPrintSettings(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load print settings from localStorage", e);
        }
    }, []);

    const handleSavePrintSettings = (settings: PrintSettings) => {
        setPrintSettings(settings);
        try {
            localStorage.setItem('attendancePrintSettings', JSON.stringify(settings));
        } catch (e) {
            console.error("Failed to save print settings to localStorage", e);
        }
        setPrintSettingsModalOpen(false);
    };

    const handlePrint = () => {
        window.print();
    };

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const changeMonth = (delta: number) => {
        setCurrentDate(new Date(year, month + delta, 1));
    };

    const getDayBackgroundColor = (date: Date): string => {
        const dateString = toLocalDateString(date);
        const setting = state.calendarSettings.find(s => s.date === dateString);
        if (setting) {
            if (setting.type === DayType.WEEKEND) return 'bg-gray-400';
            if (setting.type === DayType.NATIONAL_HOLIDAY) return 'bg-[#F7A5A5]';
            if (setting.type === DayType.JOINT_LEAVE) return 'bg-[#FFDBB6]';
        }
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) return 'bg-gray-400';
        return 'bg-white'; // Workday
    };
    
    const attendanceData = useMemo(() => {
        const monthString = `${year}-${(month + 1).toString().padStart(2, '0')}`;
        return state.attendanceRecords.filter(r => r.date.startsWith(monthString));
    }, [state.attendanceRecords, month, year]);

    const getRecord = (teacherId: string, day: number) => {
        const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        return attendanceData.find(r => r.teacherId === teacherId && r.date === dateString);
    }
    
    const getSummary = (teacher: Teacher) => {
        const summary = { S: 0, I: 0, A: 0 };
        let workDays = 0;
        const today = new Date();
        today.setHours(0,0,0,0); // Normalize today

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isWorking = isTeacherWorkDay(teacher, date, state.calendarSettings);

            if (isWorking) {
                workDays++;
            }

            const record = getRecord(teacher.id, day);
            if (record) {
                if (record.status === AttendanceStatus.SICK) summary.S++;
                else if (record.status === AttendanceStatus.PERMIT) summary.I++;
                else if (record.status === AttendanceStatus.ABSENT) summary.A++;
            } else {
                // Only count past workdays as absent if no record exists
                if (isWorking && date < today) {
                    summary.A++;
                }
            }
        }
        
        const totalAbsence = summary.S + summary.I + summary.A;
        const presentDays = workDays - totalAbsence;
        const presencePercentage = workDays > 0 ? `${Math.round((presentDays / workDays) * 100)}%` : '0%';

        return { ...summary, workDays, presentDays, presencePercentage };
    }

    const monthlySummary = useMemo(() => {
        const summary = { PRESENT: 0, SICK: 0, PERMIT: 0, ABSENT: 0 };
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        state.teachers.forEach(teacher => {
            for (let day = 1; day <= daysInMonth; day++) {
                 const date = new Date(year, month, day);
                 const isWorking = isTeacherWorkDay(teacher, date, state.calendarSettings);
                 const record = getRecord(teacher.id, day);

                if (record) {
                    summary[record.status]++;
                } else if (isWorking && date < today) {
                    summary.ABSENT++;
                }
            }
        });
        return summary;
    }, [state.teachers, daysInMonth, attendanceData, year, month, state.calendarSettings]);


    const renderCellContent = (record: AttendanceRecord | undefined): React.ReactNode => {
        if (!record) return '';
        switch (record.status) {
            case AttendanceStatus.PRESENT:
                return <div className="text-xs text-center text-black leading-tight"><p>{record.checkIn}</p><p>{record.checkOut}</p></div>;
            case AttendanceStatus.SICK: return <span className="font-bold text-blue-600">S</span>;
            case AttendanceStatus.PERMIT: return <span className="font-bold text-green-600">I</span>;
            case AttendanceStatus.ABSENT: return <span className="font-bold text-red-600">A</span>;
            default: return '';
        }
    }
    
    const handleCellClick = (teacher: Teacher, day: number) => {
        const date = new Date(year, month, day);
        if (!isTeacherWorkDay(teacher, date, state.calendarSettings)) return;
        setIndividualModalData({teacher, date});
    }

    return (
        <>
            <div className="bg-white shadow-md rounded-lg p-6 print:hidden">
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Ringkasan Bulan Ini</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-green-100 p-4 rounded-lg flex items-center shadow">
                            <div className="bg-green-500 p-3 rounded-full mr-4">
                                <CheckCircleIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-green-800 font-medium">Total Hadir</p>
                                <p className="text-2xl font-bold text-green-900">{monthlySummary.PRESENT}</p>
                            </div>
                        </div>
                        <div className="bg-blue-100 p-4 rounded-lg flex items-center shadow">
                            <div className="bg-blue-500 p-3 rounded-full mr-4">
                                <HeartPulseIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-blue-800 font-medium">Total Sakit</p>
                                <p className="text-2xl font-bold text-blue-900">{monthlySummary.SICK}</p>
                            </div>
                        </div>
                        <div className="bg-yellow-100 p-4 rounded-lg flex items-center shadow">
                            <div className="bg-yellow-500 p-3 rounded-full mr-4">
                                <FileTextIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-yellow-800 font-medium">Total Izin</p>
                                <p className="text-2xl font-bold text-yellow-900">{monthlySummary.PERMIT}</p>
                            </div>
                        </div>
                        <div className="bg-red-100 p-4 rounded-lg flex items-center shadow">
                            <div className="bg-red-500 p-3 rounded-full mr-4">
                                <XCircleIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-red-800 font-medium">Total Alpha</p>
                                <p className="text-2xl font-bold text-red-900">{monthlySummary.ABSENT}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeftIcon /></button>
                        <h2 className="text-xl font-semibold text-gray-800">
                        {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200"><ChevronRightIcon /></button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setPrintSettingsModalOpen(true)} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 shadow-sm">
                            <SettingsIcon className="w-5 h-5 mr-2" />
                            Atur Cetak
                        </button>
                        <button onClick={handlePrint} className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm">
                            <PrinterIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => setMassModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm">
                            Input Absensi Massal
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-800" rowSpan={2}>No</th>
                                <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-800" rowSpan={2}>Nama Guru</th>
                                <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-800" rowSpan={2}>Mata Pelajaran</th>
                                <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-800" colSpan={daysInMonth}>Tanggal</th>
                                <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-800" colSpan={6}>Jumlah</th>
                            </tr>
                            <tr className="bg-gray-100">
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                    <th key={day} className={`border border-gray-300 p-1 text-xs font-medium w-10 text-center text-black ${getDayBackgroundColor(new Date(year, month, day))}`}>{day}</th>
                                ))}
                                <th className="border border-gray-300 p-1 text-xs font-bold bg-gray-200 text-black">Hari Kerja</th>
                                <th className="border border-gray-300 p-1 text-xs font-bold bg-blue-100 text-black">S</th>
                                <th className="border border-gray-300 p-1 text-xs font-bold bg-green-100 text-black">I</th>
                                <th className="border border-gray-300 p-1 text-xs font-bold bg-red-100 text-black">A</th>
                                <th className="border border-gray-300 p-1 text-xs font-bold bg-cyan-100 text-black">Hadir</th>
                                <th className="border border-gray-300 p-1 text-xs font-bold bg-purple-100 text-black">% Hadir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.teachers.map((teacher, index) => {
                                const summary = getSummary(teacher);
                                return (
                                    <tr key={teacher.id} className="text-center text-sm">
                                        <td className="border border-gray-300 px-2 py-1 text-black">{index + 1}</td>
                                        <td className="border border-gray-300 px-2 py-1 text-left whitespace-nowrap">
                                            <div className="flex items-center space-x-3">
                                                <img 
                                                    className="h-8 w-8 rounded-full object-cover" 
                                                    src={teacher.profilePicture || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(teacher.name)}`} 
                                                    alt={teacher.name} 
                                                    onError={(e) => handleImageError(e, teacher.name)}
                                                />
                                                <span className="text-black">{teacher.name}</span>
                                            </div>
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-left whitespace-nowrap text-black">{teacher.subject}</td>
                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                            const record = getRecord(teacher.id, day);
                                            const date = new Date(year, month, day);
                                            const isWorking = isTeacherWorkDay(teacher, date, state.calendarSettings);
                                            const bgColor = getDayBackgroundColor(date);
                                            return (
                                                <td key={day} className={`border border-gray-300 p-0.5 h-12 w-10 ${bgColor} ${isWorking ? 'cursor-pointer hover:bg-gray-300' : 'cursor-not-allowed'}`}
                                                    onClick={() => handleCellClick(teacher, day)}>
                                                    {isWorking ? renderCellContent(record) : ''}
                                                </td>
                                            )
                                        })}
                                        <td className="border border-gray-300 font-bold bg-gray-100 text-black">{summary.workDays}</td>
                                        <td className="border border-gray-300 font-bold bg-blue-50 text-black">{summary.S || ''}</td>
                                        <td className="border border-gray-300 font-bold bg-green-50 text-black">{summary.I || ''}</td>
                                        <td className="border border-gray-300 font-bold bg-red-50 text-black">{summary.A || ''}</td>
                                        <td className="border border-gray-300 font-bold bg-cyan-50 text-black">{summary.presentDays}</td>
                                        <td className="border border-gray-300 font-bold bg-purple-50 text-black">{summary.presencePercentage}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {state.teachers.length === 0 && <p className="text-center py-10 text-gray-500">Tidak ada guru yang ditemukan. Silakan tambahkan guru di halaman 'Data Guru'.</p>}
                </div>

                <div className="mt-6 pt-4 border-t">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Keterangan</h4>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-sm mr-2 bg-white border border-gray-300"></div>
                            <span className="text-sm text-gray-600">Hari Kerja</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-sm mr-2 bg-gray-400"></div>
                            <span className="text-sm text-gray-600">Akhir Pekan</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-sm mr-2 bg-[#F7A5A5] border border-gray-300"></div>
                            <span className="text-sm text-gray-600">Libur Nasional</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-sm mr-2 bg-[#FFDBB6] border border-gray-300"></div>
                            <span className="text-sm text-gray-600">Cuti Bersama</span>
                        </div>
                    </div>
                </div>

                {isMassModalOpen && <MassAttendanceModal teachers={state.teachers} currentDate={currentDate} onClose={() => setMassModalOpen(false)} />}
                {individualModalData && <IndividualAttendanceModal 
                    teacher={individualModalData.teacher} 
                    date={individualModalData.date}
                    record={getRecord(individualModalData.teacher.id, individualModalData.date.getDate())}
                    onClose={() => setIndividualModalData(null)} 
                />}
                 {isPrintSettingsModalOpen && <PrintSettingsModal 
                    currentSettings={printSettings} 
                    onSave={handleSavePrintSettings} 
                    onClose={() => setPrintSettingsModalOpen(false)} 
                    currentMonthYear={currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                />}
            </div>
            <PrintableView
                settings={printSettings}
                currentDate={currentDate}
                state={state}
                daysInMonth={daysInMonth}
                getDayBackgroundColor={getDayBackgroundColor}
                getRecord={getRecord}
                renderCellContent={renderCellContent}
                getSummary={getSummary}
            />
        </>
    );
};

export default AttendancePage;