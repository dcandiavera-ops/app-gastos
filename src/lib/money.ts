export function formatClp(value: number) {
  return new Intl.NumberFormat('es-CL').format(Math.round(value));
}

export function startOfCurrentMonth() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  if (now.getDate() >= 24) {
    return new Date(currentYear, currentMonth, 24);
  } else {
    return new Date(currentYear, currentMonth - 1, 24);
  }
}

export function getMonthLabelDate() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  if (now.getDate() >= 24) {
    return new Date(currentYear, currentMonth + 1, 1);
  } else {
    return new Date(currentYear, currentMonth, 1);
  }
}

export function getDaysRemainingInCycle() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let endDate: Date;
  
  if (now.getDate() >= 24) {
    endDate = new Date(currentYear, currentMonth + 1, 23, 23, 59, 59, 999);
  } else {
    endDate = new Date(currentYear, currentMonth, 23, 23, 59, 59, 999);
  }
  
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
