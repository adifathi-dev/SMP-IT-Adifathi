import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  ChartOptions
} from 'chart.js';
import { useAppContext } from '../context/AppContext';
import { Teacher, CalendarDaySetting, DayType, AttendanceStatus, AttendanceRecord } from '../types';
import { FilterIcon } from '../components/Icons';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
);

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
        return false;
    }
    return teacher.workDays.includes(dayOfWeek);
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, teacherName: string) => {
    e.currentTarget.src = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(teacherName)}`;
};

const generatePeriodOptions = () => {
    const options: { value: string; label: string; group: string }[] = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    monthNames.forEach((name, index) => {
        options.push({ value: `${currentYear}-${String(index + 1).padStart(2, '0')}`, label: `${name} ${currentYear}`, group: "Bulan" });
    });

    options.push({ value: `${currentYear}-q1`, label: `Triwulan I (${currentYear})`, group: "Triwulan" });
    options.push({ value: `${currentYear}-q2`, label: `Triwulan II (${currentYear})`, group: "Triwulan" });
    options.push({ value: `${currentYear}-q3`, label: `Triwulan III (${currentYear})`, group: "Triwulan" });
    options.push({ value: `${currentYear}-q4`, label: `Triwulan IV (${currentYear})`, group: "Triwulan" });
    
    options.push({ value: `${currentYear}-s1`, label: `Semester 1 (${currentYear})`, group: "Semester" });
    options.push({ value: `${currentYear}-s2`, label: `Semester 2 (${currentYear})`, group: "Semester" });

    options.push({ value: String(currentYear), label: `Tahun ${currentYear}`, group: "Tahun" });

    return { options, default: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}` };
};

const DashboardPage: React.FC = () => {
    const { state } = useAppContext();
    const { options: periodOptions, default: defaultPeriod } = useMemo(generatePeriodOptions, []);
    const [period, setPeriod] = useState(defaultPeriod);
    const [selectedTeachersForTrend, setSelectedTeachersForTrend] = useState<string[]>([]);
    const [profileImages, setProfileImages] = useState<Record<string, HTMLImageElement>>({});
    const [isCompareMenuOpen, setCompareMenuOpen] = useState(false);
    const compareMenuRef = useRef<HTMLDivElement>(null);

    const selectedPeriodLabel = useMemo(() => periodOptions.find(opt => opt.value === period)?.label || '', [period, periodOptions]);

    useEffect(() => {
        const images: Record<string, HTMLImageElement> = {};
        state.teachers.forEach(teacher => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = teacher.profilePicture || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(teacher.name)}`;
            images[teacher.id] = img;
        });
        setProfileImages(images);
    }, [state.teachers]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (compareMenuRef.current && !compareMenuRef.current.contains(event.target as Node)) {
                setCompareMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const analysisData = useMemo(() => {
        let startDate: Date, endDate: Date;
        const year = new Date().getFullYear();
        const [periodKey, periodValue] = period.split('-');

        if (period.length === 4) {
            startDate = new Date(parseInt(period), 0, 1);
            endDate = new Date(parseInt(period), 11, 31);
        } else if (periodValue?.startsWith('q')) {
            const q = parseInt(periodValue.substring(1));
            startDate = new Date(year, (q - 1) * 3, 1);
            endDate = new Date(year, q * 3, 0);
        } else if (periodValue?.startsWith('s')) {
            const s = parseInt(periodValue.substring(1));
            startDate = new Date(year, (s - 1) * 6, 1);
            endDate = new Date(year, s * 6, 0);
        } else {
            startDate = new Date(parseInt(periodKey), parseInt(periodValue) - 1, 1);
            endDate = new Date(parseInt(periodKey), parseInt(periodValue), 0);
        }

        const filteredRecords = state.attendanceRecords.filter(r => {
            const recordDate = new Date(r.date);
            return recordDate >= startDate && recordDate <= endDate;
        });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const teacherStats = state.teachers.map(teacher => {
            let workDaysInPeriod = 0;
            const summary = { S: 0, I: 0, A: 0 };
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const currentDate = new Date(d);
                if (isTeacherWorkDay(teacher, currentDate, state.calendarSettings)) {
                    workDaysInPeriod++;
                    const dateString = toLocalDateString(currentDate);
                    const record = filteredRecords.find(r => r.teacherId === teacher.id && r.date === dateString);

                    if (record) {
                        if (record.status === AttendanceStatus.SICK) summary.S++;
                        else if (record.status === AttendanceStatus.PERMIT) summary.I++;
                        else if (record.status === AttendanceStatus.ABSENT) summary.A++;
                    } else if (currentDate < today) {
                        summary.A++;
                    }
                }
            }

            const totalAbsence = summary.S + summary.I + summary.A;
            const presentDays = Math.max(0, workDaysInPeriod - totalAbsence);
            const presencePercentage = workDaysInPeriod > 0 ? Math.round((presentDays / workDaysInPeriod) * 100) : 0;
            
            return { ...teacher, workDaysInPeriod, presentDays, ...summary, presencePercentage };
        });

        const overallStats = teacherStats.reduce((acc, curr) => ({
            PRESENT: acc.PRESENT + curr.presentDays,
            SICK: acc.SICK + curr.S,
            PERMIT: acc.PERMIT + curr.I,
            ABSENT: acc.ABSENT + curr.A,
        }), { PRESENT: 0, SICK: 0, PERMIT: 0, ABSENT: 0 });
        
        const totalWorkDaysInPeriod = teacherStats.reduce((sum, t) => sum + t.workDaysInPeriod, 0);

        const trend: { labels: string[]; datasets: Record<string, (number | null)[]> } = { labels: [], datasets: { overall: [] } };
        state.teachers.forEach(t => trend.datasets[t.id] = []);

        const isLongPeriod = period.includes('q') || period.includes('s') || period.length === 4;
        
        if (isLongPeriod) {
            const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
            const startM = startDate.getMonth();
            const endM = endDate.getMonth();
            for (let m = startM; m <= endM; m++) {
                trend.labels.push(monthLabels[m]);
                const monthStart = new Date(year, m, 1);
                const monthEnd = new Date(year, m + 1, 0);
                
                let overallMonthWorkDays = 0, overallMonthPresent = 0;
                state.teachers.forEach(teacher => {
                    const teacherMonthStats = teacherStats.find(t => t.id === teacher.id);
                    if (!teacherMonthStats) {
                        trend.datasets[teacher.id].push(0);
                        return;
                    }
                    
                    let teacherMonthWorkDays = 0;
                    let teacherMonthAbsence = 0;

                    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
                        if (isTeacherWorkDay(teacher, new Date(d), state.calendarSettings)) {
                            teacherMonthWorkDays++;
                        }
                    }

                    filteredRecords.forEach(r => {
                        const recordDate = new Date(r.date);
                        if (r.teacherId === teacher.id && recordDate.getMonth() === m) {
                             if (r.status !== AttendanceStatus.PRESENT) teacherMonthAbsence++;
                        }
                    });
                     
                    const teacherMonthPresent = teacherMonthWorkDays - teacherMonthAbsence;
                    trend.datasets[teacher.id].push(teacherMonthWorkDays > 0 ? Math.round((teacherMonthPresent / teacherMonthWorkDays) * 100) : 0);
                    overallMonthWorkDays += teacherMonthWorkDays;
                    overallMonthPresent += teacherMonthPresent;
                });
                trend.datasets['overall'].push(overallMonthWorkDays > 0 ? Math.round((overallMonthPresent / overallMonthWorkDays) * 100) : 0);
            }
        } else {
            const daysInMonth = endDate.getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                trend.labels.push(String(day));
                const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), day);
                let overallDayWork = 0, overallDayPresent = 0;

                state.teachers.forEach(teacher => {
                    let isPresent = true;
                    if (isTeacherWorkDay(teacher, currentDate, state.calendarSettings)) {
                        const record = filteredRecords.find(r => r.teacherId === teacher.id && r.date === toLocalDateString(currentDate));
                        if ((record && record.status !== AttendanceStatus.PRESENT) || (!record && currentDate < today)) {
                            isPresent = false;
                        }
                        trend.datasets[teacher.id].push(isPresent ? 100 : 0);
                        overallDayWork++;
                        if (isPresent) overallDayPresent++;
                    } else {
                       trend.datasets[teacher.id].push(null);
                    }
                });
                trend.datasets['overall'].push(overallDayWork > 0 ? Math.round((overallDayPresent / overallDayWork) * 100) : 0);
            }
        }

        return { teacherStats, overallStats, trend, totalWorkDaysInPeriod };

    }, [period, state.teachers, state.attendanceRecords, state.calendarSettings]);

    const handleTrendTeacherSelection = (teacherId: string) => {
        setSelectedTeachersForTrend(prev =>
            prev.includes(teacherId)
                ? prev.filter(id => id !== teacherId)
                : [...prev, teacherId]
        );
    };
    
    const datalabelsPlugin = {
      id: 'datalabelsPlugin',
      afterDatasetsDraw: (chart: any) => {
        const { ctx } = chart;
        const drawnPositions = new Set();
        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i);
          if (!meta.hidden) {
            meta.data.forEach((element: any, index: number) => {
              const value = dataset.data[index];
              if (value === null || value === undefined) return;
              
              const fontSize = 11;
              const fontColor = '#4b5563';
              ctx.font = `bold ${fontSize}px Arial`;
              ctx.fillStyle = fontColor;

              if (chart.options.indexAxis === 'y') {
                const x = element.x + 5;
                const y = element.y;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                if(x < chart.chartArea.right - 20) {
                    ctx.fillText(`${value}%`, x, y);
                }
              } else if (chart.config.type === 'line') {
                 if (index !== dataset.data.length - 1) return;
                 const x = element.x;
                 const y = element.y - 8;
                 const yPositionKey = Math.round(y / 10) * 10;
                 if (drawnPositions.has(yPositionKey)) return;

                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'bottom';
                 ctx.fillText(value, x, y);
                 drawnPositions.add(yPositionKey);
              }
            });
          }
        });
      }
    };
    
    const profileImagePlugin = {
        id: 'profileImage',
        afterDraw: (chart: any) => {
            if (!chart.options.plugins.profileImage?.display) return;
            const ctx = chart.ctx;
            const yAxis = chart.scales.y;

            const tickFontOptions = yAxis.options.ticks.font || ChartJS.defaults.font;
            const fontStyle = tickFontOptions.style || 'normal';
            const fontWeight = tickFontOptions.weight || 'normal';
            const fontSize = tickFontOptions.size || 12;
            const fontFamily = tickFontOptions.family || 'sans-serif';

            ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
            ctx.fillStyle = (yAxis.options.ticks.color || ChartJS.defaults.color).toString();
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            const imageSize = 24;
            const textImagePadding = 8;
            const labelRightPadding = 8;

            chart.data.labels.forEach((label: string, index: number) => {
                const teacher = analysisData.teacherStats[index];
                if (!teacher) return;

                const y = yAxis.getPixelForTick(index);
                
                const textX = yAxis.right - labelRightPadding;
                ctx.fillText(label, textX, y);
                
                const img = profileImages[teacher.id];
                if (img && img.complete) {
                    const textWidth = ctx.measureText(label).width;
                    const imageX = textX - textWidth - textImagePadding;
                    
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(imageX - imageSize / 2, y, imageSize / 2, 0, Math.PI * 2, true);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(img, imageX - imageSize, y - imageSize / 2, imageSize, imageSize);
                    ctx.restore();
                }
            });
        }
    };
    
    const getPerformanceColor = (percentage: number) => {
        if (percentage <= 20) return 'rgba(239, 68, 68, 0.7)';
        if (percentage <= 40) return 'rgba(249, 115, 22, 0.7)';
        if (percentage <= 60) return 'rgba(234, 179, 8, 0.7)';
        if (percentage <= 80) return 'rgba(132, 204, 22, 0.7)';
        return 'rgba(34, 197, 94, 0.7)';
    };

    const barData = {
        labels: analysisData.teacherStats.map(t => t.name),
        datasets: [{
            label: 'Persentase Kehadiran',
            data: analysisData.teacherStats.map(t => t.presencePercentage),
            backgroundColor: analysisData.teacherStats.map(t => getPerformanceColor(t.presencePercentage)),
            barPercentage: 0.4,
        }],
    };

    const barOptions: ChartOptions<'bar'> = {
        indexAxis: 'y' as const,
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { left: 150 } },
        scales: { 
            x: { 
                beginAtZero: true, 
                max: 100, 
                title: { display: true, text: 'Persentase (%)' } 
            },
            y: {
                ticks: {
                    display: false
                }
            }
        },
        plugins: {
            legend: { display: false },
            title: { display: true, text: `Performa Kehadiran per Guru (${selectedPeriodLabel})`, font: { size: 16 } },
            profileImage: { display: true } as any
        },
    };

    const doughnutData = {
        labels: ['Hadir', 'Sakit', 'Izin', 'Alpha'],
        datasets: [{
            data: [analysisData.overallStats.PRESENT, analysisData.overallStats.SICK, analysisData.overallStats.PERMIT, analysisData.overallStats.ABSENT],
            backgroundColor: ['#4ade80', '#60a5fa', '#facc15', '#f87171'],
            borderColor: '#ffffff',
            borderWidth: 2,
        }],
    };

    const doughnutOptions: ChartOptions<'doughnut'> = {
        responsive: true, maintainAspectRatio: false,
        cutout: '50%',
        plugins: {
            legend: {
                display: false,
            },
            title: { display: true, text: `Distribusi Absensi (${selectedPeriodLabel})`, font: { size: 16 } },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        const value = context.parsed;
                        const sum = context.dataset.data.reduce((a, b) => (a as number) + (b as number), 0);
                        const percentage = ((value / (sum as number)) * 100).toFixed(1) + '%';
                        return `${label}${value} (${percentage})`;
                    }
                }
            }
        }
    };
    
    const percentageOnDonutPlugin = {
        id: 'percentageOnDonut',
        afterDraw: (chart: any) => {
            const ctx = chart.ctx;
            const sum = chart.data.datasets[0].data.reduce((a: number,b: number) => a+b, 0);
            if (sum === 0) return;

            chart.getDatasetMeta(0).data.forEach((datapoint: any, index: number) => {
                const {x, y} = datapoint.getCenterPoint();
                const value = chart.data.datasets[0].data[index];
                if (value > 0) {
                    const percentage = ((value / sum) * 100).toFixed(1) + '%';
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(percentage, x, y);
                }
            });
        }
    }

    const trendColors = ['#f87171', '#fb923c', '#facc15', '#a3e635', '#4ade80', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'];
    
    const lineData = {
        labels: analysisData.trend.labels,
        datasets: [
            ...(selectedTeachersForTrend.length === 0 ? [{
                label: 'Rata-rata Keseluruhan',
                data: analysisData.trend.datasets.overall,
                borderColor: '#60a5fa',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 2.5,
                pointRadius: 2,
            }] : []),
            ...selectedTeachersForTrend.map((teacherId, index) => {
                const teacher = state.teachers.find(t => t.id === teacherId);
                return {
                    label: teacher?.name || 'Unknown',
                    data: analysisData.trend.datasets[teacherId],
                    borderColor: trendColors[index % trendColors.length],
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    borderWidth: 1.5,
                    pointRadius: 2,
                    spanGaps: true,
                }
            })
        ]
    };

    const lineOptions: ChartOptions<'line'> = {
        responsive: true, maintainAspectRatio: false,
        layout: {
            padding: {
                top: 30
            }
        },
        scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Persentase Kehadiran (%)' } } },
        plugins: {
            legend: { 
                position: 'top',
                labels: {
                    boxWidth: 16,
                    font: {
                        size: 10
                    }
                }
            },
            title: { 
                display: true, 
                text: `Tren Kehadiran (${selectedPeriodLabel})`, 
                font: { size: 16 },
            }
        }
    };
    
    const groupedOptions = periodOptions.reduce((acc, option) => {
        (acc[option.group] = acc[option.group] || []).push(option);
        return acc;
    }, {} as Record<string, { value: string; label: string; group: string }[]>);

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-md flex items-center space-x-4">
                <label htmlFor="period-select" className="font-semibold text-gray-700">Pilih Periode Analisis:</label>
                <select id="period-select" value={period} onChange={e => setPeriod(e.target.value)} className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                    {Object.keys(groupedOptions).map((group) => (
                        <optgroup label={group} key={group}>
                            {groupedOptions[group].map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </optgroup>
                    ))}
                </select>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Grid 1 */}
                <div className="bg-white p-6 rounded-lg shadow-md h-[450px]">
                    <div className="h-full">
                        <Bar options={barOptions} data={barData} plugins={[profileImagePlugin, datalabelsPlugin]} />
                    </div>
                </div>

                {/* Grid 2 */}
                <div className="bg-white p-6 rounded-lg shadow-md h-[450px] flex flex-col items-center">
                    <div className="w-full flex-grow">
                         <Doughnut options={doughnutOptions} data={doughnutData} plugins={[percentageOnDonutPlugin]}/>
                    </div>
                     <div className="mt-4 pt-4 border-t w-full max-w-md mx-auto">
                        <div className="flex items-start justify-center space-x-8">
                            <div className="space-y-2">
                                {doughnutData.labels.map((label, index) => {
                                    const data = doughnutData.datasets[0].data;
                                    const value = data[index] as number;
                                    const total = data.reduce((a, b) => (a as number) + (b as number), 0) as number;
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                    const color = doughnutData.datasets[0].backgroundColor[index];

                                    return (
                                        <div key={label} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center">
                                                <span className="w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: color }}></span>
                                                <span className="text-gray-600 w-12">{label}</span>
                                            </div>
                                            <span className="font-semibold text-gray-800 text-right w-20">{value} <span className="font-normal text-gray-500">({percentage}%)</span></span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-center pl-8 border-l border-gray-200">
                                <p className="text-sm text-gray-600">Total Hari Kerja Efektif</p>
                                <p className="text-2xl font-bold text-gray-800">{analysisData.totalWorkDaysInPeriod}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid 3 */}
                <div className="bg-white p-6 rounded-lg shadow-md h-[450px] flex flex-col relative">
                    <div className="absolute top-4 right-4 z-10">
                        <div className="relative" ref={compareMenuRef}>
                            <button
                                onClick={() => setCompareMenuOpen(prev => !prev)}
                                className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                                title="Bandingkan Guru"
                            >
                                <FilterIcon className="w-5 h-5" />
                            </button>
                            {isCompareMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-auto min-w-[300px] max-w-lg bg-white border border-gray-200 rounded-lg shadow-xl p-2">
                                    <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {state.teachers.map(teacher => (
                                            <label
                                                key={teacher.id}
                                                className={`flex items-center space-x-2 text-sm p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors text-blue-700 ${
                                                    selectedTeachersForTrend.includes(teacher.id) ? 'bg-green-100' : ''
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTeachersForTrend.includes(teacher.id)}
                                                    onChange={() => handleTrendTeacherSelection(teacher.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span>{teacher.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="h-full flex-grow">
                        <Line options={lineOptions} data={lineData} plugins={[datalabelsPlugin]}/>
                    </div>
                </div>

                {/* Grid 4 */}
                <div className="bg-white p-6 rounded-lg shadow-md h-[450px] flex flex-col">
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">Rincian Tren Guru Terpilih ({selectedPeriodLabel})</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow overflow-y-auto pr-2">
                        {analysisData.teacherStats.filter(t => selectedTeachersForTrend.includes(t.id)).map(teacher => (
                             <div key={teacher.id} className="border p-4 rounded-lg flex flex-col items-center text-center bg-gray-50 space-y-2">
                                <img 
                                    src={teacher.profilePicture || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(teacher.name)}`}
                                    alt={teacher.name}
                                    className="w-14 h-14 rounded-full object-cover ring-2 ring-offset-2 ring-indigo-200"
                                    onError={(e) => handleImageError(e, teacher.name)}
                                />
                                <h4 className="font-bold text-gray-800">{teacher.name}</h4>
                                <div className="grid grid-cols-4 gap-2 w-full text-center pt-2 border-t">
                                    <div>
                                        <p className="font-bold text-green-600 text-xl">{teacher.presentDays}</p>
                                        <p className="text-xs text-gray-500">Hadir</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-blue-600 text-xl">{teacher.S}</p>
                                        <p className="text-xs text-gray-500">Sakit</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-yellow-600 text-xl">{teacher.I}</p>
                                        <p className="text-xs text-gray-500">Izin</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-red-600 text-xl">{teacher.A}</p>
                                        <p className="text-xs text-gray-500">Alpha</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {selectedTeachersForTrend.length === 0 && <p className="text-sm text-gray-500 col-span-2 text-center mt-8">Pilih satu atau lebih guru dari daftar di atas untuk melihat rincian perbandingan.</p>}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;