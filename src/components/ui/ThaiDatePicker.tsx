// src/components/ui/ThaiDatePicker.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { format, addMonths, subMonths, setDate } from "date-fns";

interface ThaiDatePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Thai day and month names
const thaiDays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function ThaiDatePicker({
  selectedDate,
  onChange,
  placeholder = "เลือกวันที่",
  className = "",
  disabled = false,
}: ThaiDatePickerProps) {
  const [date, setCurrentDate] = useState<Date>(selectedDate || new Date());
  const [month, setMonth] = useState<Date>(selectedDate || new Date());
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  
  const calendarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Convert to Buddhist era (BE) year
  const toBuddhistYear = (date: Date): number => {
    return date.getFullYear() + 543;
  };
  
  // Format date for display with BE year
  const formatThaiDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const thaiYear = toBuddhistYear(date);
    return `${day}/${month}/${thaiYear}`;
  };

  // Parse Thai date input (dd/MM/yyyy BE format)
  const parseThaiDate = (dateString: string): Date | null => {
    const trimmed = dateString.trim();
    if (!trimmed) return null;

    // Match dd/MM/yyyy format
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const buddhist_year = parseInt(match[3], 10);

    // Convert Buddhist year to Gregorian year
    const gregorian_year = buddhist_year - 543;

    // Basic validation
    if (day < 1 || day > 31 || month < 1 || month > 12 || gregorian_year < 1900 || gregorian_year > 2100) {
      return null;
    }

    const newDate = new Date(gregorian_year, month - 1, day);
    
    // Check if date is valid (handles cases like Feb 30)
    if (newDate.getDate() !== day || newDate.getMonth() !== month - 1 || newDate.getFullYear() !== gregorian_year) {
      return null;
    }

    return newDate;
  };

  // Handle outside click to close calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update input value when selected date changes (but not when user is typing)
  useEffect(() => {
    if (selectedDate && !isInputFocused) {
      setInputValue(formatThaiDate(selectedDate));
      setCurrentDate(selectedDate);
      setMonth(selectedDate);
    } else if (!selectedDate && !isInputFocused) {
      setInputValue("");
    }
  }, [selectedDate, isInputFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Only parse when user is not actively editing
    // We'll handle parsing in onBlur instead to avoid interrupting typing
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    
    // When user finishes typing, try to parse the input
    const parsedDate = parseThaiDate(inputValue);
    if (parsedDate) {
      setCurrentDate(parsedDate);
      setMonth(parsedDate);
      onChange(parsedDate);
      // Update input to properly formatted version
      setInputValue(formatThaiDate(parsedDate));
    } else if (inputValue.trim() === "") {
      // Clear date if input is empty
      setInputValue("");
      // You might want to call onChange with null or a special value here
    } else {
      // If input is invalid, revert to previous valid date
      if (selectedDate) {
        setInputValue(formatThaiDate(selectedDate));
      } else {
        setInputValue("");
      }
    }
  };

  const handleSelectDate = (day: number) => {
    const newDate = setDate(month, day);
    setCurrentDate(newDate);
    onChange(newDate);
    setInputValue(formatThaiDate(newDate));
    setShowCalendar(false);
  };

  const toggleCalendar = () => {
    if (!disabled) {
      setShowCalendar(!showCalendar);
      if (!showCalendar) {
        // Focus input when opening calendar for better UX
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  const nextMonth = () => {
    setMonth(addMonths(month, 1));
  };

  const prevMonth = () => {
    setMonth(subMonths(month, 1));
  };

  const handleClear = () => {
    setInputValue("");
    setShowCalendar(false);
    // Create a very old date to represent "no date" - you might want to handle this differently
    const clearDate = new Date(1900, 0, 1);
    onChange(clearDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setMonth(today);
    onChange(today);
    setInputValue(formatThaiDate(today));
    setShowCalendar(false);
  };

  // Handle Enter key and Escape key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Parse immediately when Enter is pressed
      const parsedDate = parseThaiDate(inputValue);
      if (parsedDate) {
        setCurrentDate(parsedDate);
        setMonth(parsedDate);
        onChange(parsedDate);
        setInputValue(formatThaiDate(parsedDate));
      }
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Revert to original value on Escape
      if (selectedDate) {
        setInputValue(formatThaiDate(selectedDate));
      } else {
        setInputValue("");
      }
      setShowCalendar(false);
      inputRef.current?.blur();
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0
    ).getDate();
    
    const firstDayOfMonth = new Date(
      month.getFullYear(),
      month.getMonth(),
      1
    ).getDay();
    
    const lastDayPrevMonth = new Date(
      month.getFullYear(),
      month.getMonth(),
      0
    ).getDate();
    
    const days = [];
    
    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: lastDayPrevMonth - i,
        currentMonth: false,
        date: new Date(month.getFullYear(), month.getMonth() - 1, lastDayPrevMonth - i)
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        currentMonth: true,
        date: new Date(month.getFullYear(), month.getMonth(), i),
        isToday: new Date().toDateString() === new Date(month.getFullYear(), month.getMonth(), i).toDateString(),
        isSelected: selectedDate && selectedDate.toDateString() === new Date(month.getFullYear(), month.getMonth(), i).toDateString()
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length; // 6 rows of 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        currentMonth: false,
        date: new Date(month.getFullYear(), month.getMonth() + 1, i)
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onClick={toggleCalendar}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-2 pr-10 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        />
        <div 
          className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer" 
          onClick={toggleCalendar}
        >
          <span className="text-blue-400">📅</span>
        </div>
      </div>

      {/* Format hint */}
      <div className="text-xs text-blue-500 mt-1">
        รูปแบบ: วว/ดด/ปปปป (เช่น 23/12/2568) • กด Enter เพื่อยืนยัน หรือ Esc เพื่อยกเลิก
      </div>

      {showCalendar && (
        <div 
          ref={calendarRef}
          className="absolute z-50 mt-1 bg-white rounded-lg shadow-lg border border-blue-100 p-2"
          style={{ width: "280px" }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <div className="text-blue-800 font-medium">
              {thaiMonths[month.getMonth()]} {toBuddhistYear(month)}
            </div>
            <div className="flex space-x-1">
              <button 
                onClick={prevMonth} 
                className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                aria-label="Previous Month"
              >
                ←
              </button>
              <button 
                onClick={nextMonth} 
                className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                aria-label="Next Month"
              >
                →
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {thaiDays.map((day, index) => (
              <div 
                key={index} 
                className="text-center text-xs text-blue-600 font-medium p-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => day.currentMonth && handleSelectDate(day.day)}
                className={`w-8 h-8 flex items-center justify-center text-xs rounded-full transition-colors
                  ${day.currentMonth ? "hover:bg-blue-100 text-gray-700" : "text-gray-400"}
                  ${day.isToday ? "border border-blue-400" : ""}
                  ${day.isSelected ? "bg-blue-500 text-white hover:bg-blue-600" : ""}
                `}
                disabled={!day.currentMonth}
              >
                {day.day}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-3 text-xs">
            <button 
              onClick={handleClear}
              className="text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
            >
              Clear
            </button>
            <button 
              onClick={handleToday}
              className="text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}