// WeeklyCalendar.js
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WeeklyCalendar = ({ onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Generate week days on component mount or when current date changes
  useEffect(() => {
    generateWeekDays(currentDate);
  }, [currentDate]);
  
  // Function to generate an array of dates for the week
  const generateWeekDays = (date) => {
    const days = [];
    const currentDay = date.getDay(); // 0-6 (Sunday-Saturday)
    
    // Find the first day of the week (Sunday)
    const firstDayOfWeek = new Date(date);
    firstDayOfWeek.setDate(date.getDate() - currentDay);
    
    // Generate 7 days starting from Sunday
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDayOfWeek);
      day.setDate(firstDayOfWeek.getDate() + i);
      days.push(day);
    }
    
    setWeekDays(days);
  };
  
  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };
  
  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };
  
  // Navigate to current week
  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };
  
  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };
  
  // Check if a date is today
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };
  
  // Check if a date is selected
  const isSelected = (date) => {
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };
  
  // Format the month and year for display
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Get the current month and year from the first and last day of the week
  const getDisplayMonthYear = () => {
    if (weekDays.length === 0) return '';
    
    const firstDayMonth = weekDays[0].toLocaleDateString('en-US', { month: 'long' });
    const lastDayMonth = weekDays[6].toLocaleDateString('en-US', { month: 'long' });
    const year = weekDays[0].getFullYear();
    
    if (firstDayMonth === lastDayMonth) {
      return `${firstDayMonth} ${year}`;
    } else {
      return `${firstDayMonth} - ${lastDayMonth} ${year}`;
    }
  };
  
  // Format day of week
  const formatDayOfWeek = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  // Format day of month
  const formatDayOfMonth = (date) => {
    return date.getDate();
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between px-4 py-2 bg-blue-600 text-white">
        <button 
          onClick={goToPreviousWeek}
          className="p-1 rounded hover:bg-blue-700 transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-semibold">{getDisplayMonthYear()}</h2>
          <button 
            onClick={goToCurrentWeek}
            className="text-xs underline hover:text-blue-200"
          >
            Today
          </button>
        </div>
        
        <button 
          onClick={goToNextWeek}
          className="p-1 rounded hover:bg-blue-700 transition-colors"
          aria-label="Next week"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      {/* Days of the week */}
      <div className="grid grid-cols-7 divide-x divide-gray-200">
        {weekDays.map((day, index) => (
          <button
            key={index}
            className={`p-2 flex flex-col items-center transition-colors ${
              isSelected(day) 
                ? 'bg-blue-100 text-blue-800' 
                : isToday(day) 
                  ? 'bg-yellow-50 text-yellow-800' 
                  : 'hover:bg-gray-100'
            }`}
            onClick={() => handleDateSelect(day)}
          >
            <span className="text-xs font-medium text-gray-500">
              {formatDayOfWeek(day)}
            </span>
            <span className={`text-lg font-semibold mt-1 ${
              isToday(day) ? 'text-blue-600' : ''
            }`}>
              {formatDayOfMonth(day)}
            </span>
            {isToday(day) && (
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WeeklyCalendar;