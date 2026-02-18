-- Fix Ramadan 2026 dates: all dates are shifted +10 days, correct them back to Feb 18 start
UPDATE ramadan_calendar
SET 
  gregorian_start_date = gregorian_start_date - INTERVAL '10 days',
  gregorian_end_date = gregorian_end_date - INTERVAL '10 days'
WHERE year = 2026;