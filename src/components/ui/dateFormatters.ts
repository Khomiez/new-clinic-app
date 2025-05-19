// src/utils/dateFormatters.ts
export const formatDateThai = (date: Date | string | undefined): string => {
  if (!date) return "ไม่มีข้อมูล";

  try {
    const dateObj = new Date(date);

    // Thai Buddhist Era (BE) is 543 years ahead of CE
    const buddhistYear = dateObj.getFullYear() + 543;

    // Format as DD/MM/YYYY BE
    return dateObj.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      calendar: "buddhist", // Use Buddhist calendar
    });
  } catch (e) {
    console.error("Date formatting error:", e);
    return "ไม่มีข้อมูล";
  }
};

// For date and time formatting
export const formatDateTimeThai = (date: Date | string | undefined): string => {
  if (!date) return "ไม่มีข้อมูล";

  try {
    const dateObj = new Date(date);

    // Format as DD/MM/YYYY HH:MM in Thai
    return dateObj.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      calendar: "buddhist", // Use Buddhist calendar
    });
  } catch (e) {
    console.error("DateTime formatting error:", e);
    return "ไม่มีข้อมูล";
  }
};

// For input fields that need yyyy-MM-dd format
export const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) return "";

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().split("T")[0]; // Returns YYYY-MM-DD
  } catch (e) {
    console.error("Input date formatting error:", e);
    return "";
  }
};
