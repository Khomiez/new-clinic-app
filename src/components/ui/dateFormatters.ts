// src/utils/dateFormatters.ts
export const formatDateThai = (date: Date | string | undefined): string => {
  if (!date) return "ไม่มีข้อมูล";

  try {
    const dateObj = new Date(date);

    // Format using Thai locale with Buddhist calendar
    return dateObj.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
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

    // Format as day/month/year hour:minute in Thai with Buddhist Era
    return dateObj.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
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