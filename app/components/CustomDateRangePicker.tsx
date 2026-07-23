'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDateRangePickerProps {
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  className?: string;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDateInput(date: Date | undefined) {
  if (!date) return 'dd/mm/aaaa';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function CalendarGrid({ 
  date, 
  setDate, 
  title 
}: { 
  date: Date | undefined, 
  setDate: (d: Date) => void, 
  title: string 
}) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    const d = date || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  return (
    <div className="w-[200px]">
      <div className="text-[11px] font-medium text-slate-500 mb-1.5">{title}</div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 font-medium mb-3 text-center shadow-sm">
        {formatDateInput(date)}
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <button type="button" onClick={handlePrevMonth} className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[11px] font-bold text-slate-800 capitalize">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button type="button" onClick={handleNextMonth} className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 gap-x-0 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[9px] font-bold text-slate-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 gap-x-0">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-7 w-full" />
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected = date?.getDate() === day && date?.getMonth() === currentMonth.getMonth() && date?.getFullYear() === currentMonth.getFullYear();
          const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();

          return (
            <button
              key={day}
              type="button"
              onClick={() => setDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
              className={`h-7 w-full rounded-md text-[11px] font-medium transition-colors flex items-center justify-center ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : isToday
                  ? 'bg-slate-100 text-[#F7C00C] font-bold hover:bg-slate-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CustomDateRangePicker({ startDate, setStartDate, endDate, setEndDate, className = '' }: CustomDateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-start gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#F7C00C]/50 ${
          isOpen ? 'border-[#F7C00C]' : 'border-slate-200'
        } ${!startDate && !endDate ? 'text-slate-400' : ''}`}
      >
        <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">
          {startDate ? (
            endDate ? (
              <>
                {formatDateInput(startDate)} <span className="mx-1 text-slate-400 font-normal">até</span> {formatDateInput(endDate)}
              </>
            ) : (
              `${formatDateInput(startDate)} até ...`
            )
          ) : (
            'Selecione o período'
          )}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-200 w-max origin-top-right">
          <div className="flex flex-col md:flex-row gap-5">
            <CalendarGrid 
              date={startDate} 
              setDate={setStartDate} 
              title="Início do período" 
            />
            <div className="hidden md:block w-px bg-slate-100" />
            <CalendarGrid 
              date={endDate} 
              setDate={setEndDate} 
              title="Fim do período" 
            />
          </div>
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-slate-900 px-5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-slate-800"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
