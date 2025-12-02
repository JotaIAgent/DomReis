import { parseISO, isValid } from 'date-fns';

/**
 * Parses a date string (ISO, YYYY-MM-DD, or DD/MM/YYYY) into a Date object
 * representing that date in the local timezone (America/Sao_Paulo).
 * 
 * @param {string} dateStr - The date string to parse.
 * @returns {Date|null} - A Date object set to midnight of the parsed date, or null if invalid.
 */
export const parseDateToLocal = (dateStr) => {
    if (!dateStr) return null;

    try {
        let dateObj = null;

        // Handle ISO strings (e.g., 2025-12-02T02:00:00.000Z)
        if (dateStr.includes('T')) {
            // Create a Date object from the ISO string
            const utcDate = new Date(dateStr);

            // Convert to Sao Paulo time string to get the correct "day" in that timezone
            const spDateStr = utcDate.toLocaleDateString('en-CA', { // en-CA gives YYYY-MM-DD
                timeZone: 'America/Sao_Paulo'
            });

            // Parse the YYYY-MM-DD string as a local date (midnight)
            const [year, month, day] = spDateStr.split('-').map(Number);
            dateObj = new Date(year, month - 1, day);
        }
        // Handle YYYY-MM-DD (e.g., 2025-12-02)
        else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            dateObj = new Date(year, month - 1, day);
        }
        // Handle DD/MM/YYYY (e.g., 02/12/2025)
        else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const [day, month, year] = dateStr.split('/').map(Number);
            dateObj = new Date(year, month - 1, day);
        }
        // Handle DD/MM (e.g., 02/12) - assumes current year
        else if (dateStr.match(/^\d{2}\/\d{2}$/)) {
            const [day, month] = dateStr.split('/').map(Number);
            const year = new Date().getFullYear();
            dateObj = new Date(year, month - 1, day);
        }

        return isValid(dateObj) ? dateObj : null;
    } catch (error) {
        console.error('Error parsing date:', dateStr, error);
        return null;
    }
};

/**
 * Checks if two dates are the same day in the local timezone.
 * @param {Date} date1 
 * @param {Date} date2 
 * @returns {boolean}
 */
export const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};
