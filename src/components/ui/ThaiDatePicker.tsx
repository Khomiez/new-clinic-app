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
  
  const calendarRef = useRef<HTMLDivElement>(null);
  
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

  // Update input value when selected date changes
  useEffect(() => {
    if (selectedDate) {
      setInputValue(formatThaiDate(selectedDate));
      setCurrentDate(selectedDate);
      setMonth(selectedDate);
    } else {
      setInputValue("");
    }
  }, [selectedDate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Parse the input date (assuming dd/MM/yyyy format)
    const parts = value.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      // Convert from Buddhist to Gregorian year
      const year = parseInt(parts[2], 10) - 543;
      
      const newDate = new Date(year, month, day);
      if (!isNaN(newDate.getTime())) {
        setCurrentDate(newDate);
        setMonth(newDate);
        onChange(newDate);
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
    onChange(new Date(0)); // Use epoch time to represent "no date"
    setShowCalendar(false);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setMonth(today);
    onChange(today);
    setInputValue(formatThaiDate(today));
    setShowCalendar(false);
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
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onClick={toggleCalendar}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        />
        <div 
          className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer" 
          onClick={toggleCalendar}
        >
          <span className="text-blue-400">📅</span>
        </div>
      </div>

      {showCalendar && (
        <div 
          ref={calendarRef}
          className="absolute z-50 mt-1 bg-white rounded-lg shadow-lg border border-blue-100 p-2"
          style={{ width: "240px" }}
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
                ↑
              </button>
              <button 
                onClick={nextMonth} 
                className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                aria-label="Next Month"
              >
                ↓
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {thaiDays.map((day, index) => (
              <div 
                key={index} 
                className="text-center text-xs text-blue-600 font-medium"
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
                className={`w-8 h-8 flex items-center justify-center text-xs rounded-full
                  ${day.currentMonth ? "hover:bg-blue-100" : "text-gray-400"}
                  ${day.isToday ? "border border-blue-400" : ""}
                  ${day.isSelected ? "bg-blue-500 text-white hover:bg-blue-600" : ""}
                `}
              >
                {day.day}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-2 text-xs">
            <button 
              onClick={handleClear}
              className="text-blue-500 hover:text-blue-700 px-2 py-1"
            >
              Clear
            </button>
            <button 
              onClick={handleToday}
              className="text-blue-500 hover:text-blue-700 px-2 py-1"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}