import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface DateRangePickerProps {
  from: string;
  to: string;
  onRangeChange: (from: string, to: string) => void;
}

/* ================= DATE UTILS ================= */

const formatDisplayDate = (date: Date) => {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatInputDateTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatJustDate = (date: Date | null) => {
  if (!date || isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatJustTime = (date: Date | null) => {
  if (!date || isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function formatDateOnInput(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

interface TimePickerInputProps {
  value: string;
  onChange: (timeStr: string) => void;
}

const TimePickerInput: React.FC<TimePickerInputProps> = ({ value, onChange }) => {
  const [hours, setHours] = useState(() => {
    const parts = (value || "").split(":");
    return parts[0] || "00";
  });
  const [minutes, setMinutes] = useState(() => {
    const parts = (value || "").split(":");
    return parts[1] || "00";
  });

  const [hourBuffer, setHourBuffer] = useState<string | null>(null);
  const [minBuffer, setMinBuffer] = useState<string | null>(null);

  const hourRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const [h, m] = (value || "").split(":");
    if (h !== undefined && hourBuffer === null) setHours(h.padStart(2, "0"));
    if (m !== undefined && minBuffer === null) setMinutes(m.padStart(2, "0"));
  }, [value, hourBuffer, minBuffer]);

  const commitTime = (hVal: string, mVal: string) => {
    const h = (hVal || "00").padStart(2, "0").slice(-2);
    const m = (mVal || "00").padStart(2, "0").slice(-2);
    let hNum = parseInt(h, 10);
    let mNum = parseInt(m, 10);
    if (isNaN(hNum)) hNum = 0;
    if (isNaN(mNum)) mNum = 0;
    hNum = Math.min(23, Math.max(0, hNum));
    mNum = Math.min(59, Math.max(0, mNum));
    const pad = (n: number) => String(n).padStart(2, "0");
    onChange(`${pad(hNum)}:${pad(mNum)}`);
  };

  const handleHourFocus = () => {
    setHourBuffer("");
    requestAnimationFrame(() => hourRef.current?.select());
  };

  const handleHourBlur = () => {
    let finalH = hours;
    if (hourBuffer !== null) {
      const num = parseInt(hourBuffer, 10);
      if (isNaN(num)) {
        finalH = hours || "00";
      } else {
        finalH = String(Math.min(23, Math.max(0, num))).padStart(2, "0");
      }
      setHourBuffer(null);
      setHours(finalH);
      commitTime(finalH, minutes);
    }
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const digit = e.key;
      const currentBuf = hourBuffer ?? "";

      if (currentBuf === "") {
        const num = parseInt(digit, 10);
        if (num > 2) {
          // Digits 3-9: cannot have 2nd digit in 24h clock -> format as 0X and move to minutes
          const val = `0${num}`;
          setHours(val);
          setHourBuffer(null);
          commitTime(val, minutes);
          minRef.current?.focus();
        } else {
          // 0, 1, 2: wait for second digit
          setHourBuffer(digit);
          setHours(digit);
        }
      } else {
        // Second digit of hour
        let num = parseInt(currentBuf + digit, 10);
        if (num > 23) num = 23;
        const val = String(num).padStart(2, "0");
        setHours(val);
        setHourBuffer(null);
        commitTime(val, minutes);
        minRef.current?.focus();
      }
    } else if (e.key === "Backspace") {
      e.preventDefault();
      setHourBuffer("");
      setHours("00");
    } else if (e.key === "ArrowRight" || e.key === ":") {
      e.preventDefault();
      handleHourBlur();
      minRef.current?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const cur = parseInt(hours, 10) || 0;
      const next = cur >= 23 ? 0 : cur + 1;
      const val = String(next).padStart(2, "0");
      setHours(val);
      setHourBuffer(null);
      commitTime(val, minutes);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const cur = parseInt(hours, 10) || 0;
      const next = cur <= 0 ? 23 : cur - 1;
      const val = String(next).padStart(2, "0");
      setHours(val);
      setHourBuffer(null);
      commitTime(val, minutes);
    }
  };

  const handleMinFocus = () => {
    setMinBuffer("");
    requestAnimationFrame(() => minRef.current?.select());
  };

  const handleMinBlur = () => {
    let finalM = minutes;
    if (minBuffer !== null) {
      const num = parseInt(minBuffer, 10);
      if (isNaN(num)) {
        finalM = minutes || "00";
      } else {
        finalM = String(Math.min(59, Math.max(0, num))).padStart(2, "0");
      }
      setMinBuffer(null);
      setMinutes(finalM);
      commitTime(hours, finalM);
    }
  };

  const handleMinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const digit = e.key;
      const currentBuf = minBuffer ?? "";

      if (currentBuf === "") {
        const num = parseInt(digit, 10);
        if (num > 5) {
          // Digits 6-9: cannot have 2nd digit in minutes -> format as 0X
          const val = `0${num}`;
          setMinutes(val);
          setMinBuffer(null);
          commitTime(hours, val);
        } else {
          // 0-5: wait for second digit
          setMinBuffer(digit);
          setMinutes(digit);
        }
      } else {
        // Second digit of minute
        let num = parseInt(currentBuf + digit, 10);
        if (num > 59) num = 59;
        const val = String(num).padStart(2, "0");
        setMinutes(val);
        setMinBuffer(null);
        commitTime(hours, val);
      }
    } else if (e.key === "Backspace") {
      e.preventDefault();
      if (minBuffer === "" || minBuffer === null) {
        hourRef.current?.focus();
      } else {
        setMinBuffer("");
        setMinutes("00");
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handleMinBlur();
      hourRef.current?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const cur = parseInt(minutes, 10) || 0;
      const next = cur >= 59 ? 0 : cur + 1;
      const val = String(next).padStart(2, "0");
      setMinutes(val);
      setMinBuffer(null);
      commitTime(hours, val);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const cur = parseInt(minutes, 10) || 0;
      const next = cur <= 0 ? 59 : cur - 1;
      const val = String(next).padStart(2, "0");
      setMinutes(val);
      setMinBuffer(null);
      commitTime(hours, val);
    }
  };

  return (
    <div className="flex items-center text-xs sm:text-sm font-semibold text-gray-700">
      <input
        ref={hourRef}
        type="text"
        inputMode="numeric"
        value={hours}
        onChange={() => {}}
        onKeyDown={handleHourKeyDown}
        onBlur={handleHourBlur}
        onFocus={handleHourFocus}
        placeholder="HH"
        maxLength={2}
        className="text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent w-[18px] text-center tracking-tight p-0"
      />
      <span className="text-gray-400 font-medium text-xs mx-[1px] select-none">:</span>
      <input
        ref={minRef}
        type="text"
        inputMode="numeric"
        value={minutes}
        onChange={() => {}}
        onKeyDown={handleMinKeyDown}
        onBlur={handleMinBlur}
        onFocus={handleMinFocus}
        placeholder="mm"
        maxLength={2}
        className="text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent w-[18px] text-center tracking-tight p-0"
      />
    </div>
  );
};




const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Adjust to start Monday (0-6)
};

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isBetween = (date: Date, start: Date, end: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d > s && d < e;
};

/* ================= COMPONENT ================= */

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ from, to, onRangeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>('left');
  const containerRef = useRef<HTMLDivElement>(null);

  // Temporary selection state
  const [startDate, setStartDate] = useState<Date>(new Date(from));
  const [endDate, setEndDate] = useState<Date>(new Date(to));
  const [startDateText, setStartDateText] = useState<string>(formatJustDate(new Date(from)));
  const [startTimeText, setStartTimeText] = useState<string>(formatJustTime(new Date(from)));
  const [endDateText, setEndDateText] = useState<string>(formatJustDate(new Date(to)));
  const [endTimeText, setEndTimeText] = useState<string>(formatJustTime(new Date(to)));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // View state (which months are visible)
  const [viewDate, setViewDate] = useState(new Date(startDate));

  // Sync inputs when startDate / endDate change
  useEffect(() => {
    setStartDateText(formatJustDate(startDate));
    setStartTimeText(formatJustTime(startDate));
  }, [startDate]);

  useEffect(() => {
    setEndDateText(formatJustDate(endDate || startDate));
    setEndTimeText(formatJustTime(endDate || startDate));
  }, [endDate]);

  useEffect(() => {
    const s = new Date(from);
    setStartDate(s);
    setStartDateText(formatJustDate(s));
    setStartTimeText(formatJustTime(s));
  }, [from]);

  useEffect(() => {
    const e = new Date(to);
    setEndDate(e);
    setEndDateText(formatJustDate(e));
    setEndTimeText(formatJustTime(e));
  }, [to]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute dropdown alignment when it opens
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const estimatedWidth = 760;
    if (rect.left + estimatedWidth > window.innerWidth) {
      setDropdownAlign('right');
    } else {
      setDropdownAlign('left');
    }
  }, [isOpen]);

  const handleDayClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      const newStart = new Date(date);
      newStart.setHours(startDate ? startDate.getHours() : 0, startDate ? startDate.getMinutes() : 0, 0, 0);
      setStartDate(newStart);
      setEndDate(null as any);
    } else if (startDate && !endDate) {
      if (date < startDate) {
        const newStart = new Date(date);
        newStart.setHours(0, 0, 0, 0);
        const newEnd = new Date(startDate);
        newEnd.setHours(23, 59, 59, 999);
        setEndDate(newEnd);
        setStartDate(newStart);
      } else {
        const newEnd = new Date(date);
        newEnd.setHours(23, 59, 59, 999);
        setEndDate(newEnd);
      }
    }
  };

  const applyPreset = (type: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (type) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case "this-week":
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case "last-week":
        const lastWeekStart = new Date();
        const d = now.getDay();
        lastWeekStart.setDate(now.getDate() - d - 6 + (d === 0 ? -6 : 0));
        start = lastWeekStart;
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case "this-month":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last-month":
        start.setMonth(now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "this-year":
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(now.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      case "last-year":
        start.setFullYear(now.getFullYear() - 1, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(now.getFullYear() - 1, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      case "all-time":
        start = new Date(2020, 0, 1);
        break;
    }

    setStartDate(start);
    setEndDate(end);
    setViewDate(new Date(start));
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateOnInput(e.target.value);
    setStartDateText(formatted);
    if (formatted.length === 10) {
      const [y, m, d] = formatted.split("-").map(Number);
      if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const updated = new Date(startDate);
        updated.setFullYear(y, m - 1, d);
        if (!isNaN(updated.getTime()) && updated.getDate() === d) {
          setStartDate(updated);
          setViewDate(new Date(updated));
        }
      }
    }
  };

  const handleStartDateBlur = () => {
    setStartDateText(formatJustDate(startDate));
  };

  const handleStartTimeChange = (timeStr: string) => {
    setStartTimeText(timeStr);
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const updated = new Date(startDate);
        updated.setHours(h, m, 0, 0);
        setStartDate(updated);
      }
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateOnInput(e.target.value);
    setEndDateText(formatted);
    if (formatted.length === 10) {
      const [y, m, d] = formatted.split("-").map(Number);
      if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const updated = new Date(endDate || startDate);
        updated.setFullYear(y, m - 1, d);
        if (!isNaN(updated.getTime()) && updated.getDate() === d) {
          setEndDate(updated);
        }
      }
    }
  };

  const handleEndDateBlur = () => {
    setEndDateText(formatJustDate(endDate || startDate));
  };

  const handleEndTimeChange = (timeStr: string) => {
    setEndTimeText(timeStr);
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const updated = new Date(endDate || startDate);
        updated.setHours(h, m, 59, 999);
        setEndDate(updated);
      }
    }
  };

  const handleApply = () => {
    const s = startDate;
    const e = endDate || startDate;
    onRangeChange(formatInputDateTime(s), formatInputDateTime(e));
    setIsOpen(false);
  };

  const renderMonth = (monthOffset: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, 1);
    const monthName = date.toLocaleString("fr-FR", { month: "long" });
    const year = date.getFullYear();
    const month = date.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const days = [];
    // Previous month filler
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, current: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, current: true, date: new Date(year, month, i) });
    }
    // Next month filler
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, current: false, date: new Date(year, month + 1, i) });
    }

    return (
      <div className="w-[280px]">
        <div className="mb-4 flex items-center justify-center font-semibold text-gray-700">
          {monthName} {year}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="text-xs font-medium text-gray-400 py-2">
              {d}
            </div>
          ))}
          {days.map((d, idx) => {
            const isSelected = (startDate && isSameDay(d.date, startDate)) || (endDate && isSameDay(d.date, endDate));
            const isInRange = startDate && endDate && isBetween(d.date, startDate, endDate);
            const isHovered = startDate && !endDate && hoverDate && (
              (d.date > startDate && d.date <= hoverDate) || (d.date < startDate && d.date >= hoverDate)
            );

            return (
              <button
                key={idx}
                onClick={() => handleDayClick(d.date)}
                onMouseEnter={() => setHoverDate(d.date)}
                className={`relative h-9 w-9 text-sm transition-all flex items-center justify-center
                  ${!d.current ? "text-gray-300" : "text-gray-700"}
                  ${isSelected ? "bg-[#3B82F6] text-white rounded-lg z-10" : ""}
                  ${isInRange ? "bg-[#3B82F6]/10 text-[#3B82F6]" : ""}
                  ${isHovered ? "bg-[#3B82F6]/5" : ""}
                  hover:bg-gray-100 rounded-lg
                `}
              >
                {d.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-xl border border-[#3B82F6]/30 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-[#3B82F6] transition-all"
      >
        <CalendarIcon className="h-4 w-4 text-[#3B82F6]" />
        <span>
          {formatDisplayDate(new Date(from))} - {formatDisplayDate(new Date(to))}
        </span>
      </button>

      {/* Picker Popover */}
      {isOpen && (
        <div className={`absolute ${dropdownAlign === 'right' ? 'right-0' : 'left-0'} mt-2 z-50 flex flex-col rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 lg:flex-row lg:w-auto w-[95vw]`}>
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-1 shrink-0">
            {[
              { id: "today", label: "Aujourd'hui" },
              { id: "yesterday", label: "Hier" },
              { id: "this-week", label: "Cette semaine" },
              { id: "last-week", label: "Semaine dernière" },
              { id: "this-month", label: "Ce mois-ci" },
              { id: "last-month", label: "Mois dernier" },
              { id: "this-year", label: "Cette année" },
              { id: "last-year", label: "Année dernière" },
              { id: "all-time", label: "Tout le temps" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:bg-white hover:text-[#3B82F6] hover:shadow-sm rounded-xl transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Main Calendar Area */}
          <div className="flex flex-col">
            {/* Top Controls */}
            <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 shrink-0">
                {/* Start Date / Time Pill */}
                <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-sm focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-[#3B82F6]/20 transition-all">
                  <input
                    type="text"
                    value={startDateText}
                    onChange={handleStartDateChange}
                    onBlur={handleStartDateBlur}
                    placeholder="AAAA-MM-JJ"
                    maxLength={10}
                    className="text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent w-[80px] text-center tracking-tight"
                  />
                  <span className="text-gray-400 font-normal text-xs select-none mx-1">-</span>
                  <TimePickerInput
                    value={startTimeText}
                    onChange={handleStartTimeChange}
                  />
                </div>

                <div className="h-px w-3 bg-gray-300 shrink-0" />

                {/* End Date / Time Pill */}
                <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-sm focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-[#3B82F6]/20 transition-all">
                  <input
                    type="text"
                    value={endDateText}
                    onChange={handleEndDateChange}
                    onBlur={handleEndDateBlur}
                    placeholder="AAAA-MM-JJ"
                    maxLength={10}
                    className="text-xs sm:text-sm font-semibold text-gray-700 outline-none bg-transparent w-[80px] text-center tracking-tight"
                  />
                  <span className="text-gray-400 font-normal text-xs select-none mx-1">-</span>
                  <TimePickerInput
                    value={endTimeText}
                    onChange={handleEndTimeChange}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleApply}
                  className="rounded-xl bg-[#3B82F6] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563EB] active:scale-95 transition-all"
                >
                  Appliquer
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 p-6">
              {/* Left Calendar */}
              <div className="relative">
                <button
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                  className="absolute left-0 top-0 p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {renderMonth(0)}
              </div>

              {/* Right Calendar */}
              <div className="relative">
                <button
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                  className="absolute right-0 top-0 p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                {renderMonth(1)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

