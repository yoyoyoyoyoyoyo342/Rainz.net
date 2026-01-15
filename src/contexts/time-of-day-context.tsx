import React, { createContext, useContext, useState, ReactNode } from 'react';

type TimeOfDay = 'day' | 'night' | 'sunrise' | 'sunset';

interface TimeOfDayContextType {
  timeOfDay: TimeOfDay;
  setTimeOfDay: (timeOfDay: TimeOfDay) => void;
  isNightTime: boolean;
}

const TimeOfDayContext = createContext<TimeOfDayContextType | undefined>(undefined);

export function TimeOfDayProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const isNightTime = timeOfDay === 'night';

  return (
    <TimeOfDayContext.Provider value={{ timeOfDay, setTimeOfDay, isNightTime }}>
      {children}
    </TimeOfDayContext.Provider>
  );
}

export function useTimeOfDayContext(): TimeOfDayContextType {
  const context = useContext(TimeOfDayContext);
  if (context === undefined) {
    throw new Error('useTimeOfDayContext must be used within a TimeOfDayProvider');
  }
  return context;
}
