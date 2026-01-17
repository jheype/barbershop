export function toParamDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 dom … 6 sáb
  const diff = (day === 0 ? -6 : 1) - day; 
  return addDays(d, diff);
}

export function hoursBetween(start: number, end: number) {
  const arr: string[] = [];
  for (let h = start; h <= end; h++) {
    arr.push(String(h).padStart(2, "0") + ":00");
  }
  return arr;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
