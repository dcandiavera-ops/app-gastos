export function formatClp(value: number) {
  return new Intl.NumberFormat('es-CL').format(Math.round(value));
}

export function startOfCurrentMonth() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  if (now.getDate() >= 25) {
    return new Date(currentYear, currentMonth, 25);
  } else {
    return new Date(currentYear, currentMonth - 1, 25);
  }
}

export function getMonthLabelDate() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  if (now.getDate() >= 25) {
    return new Date(currentYear, currentMonth + 1, 1);
  } else {
    return new Date(currentYear, currentMonth, 1);
  }
}
