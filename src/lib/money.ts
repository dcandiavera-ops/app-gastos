export function formatClp(value: number) {
  return new Intl.NumberFormat('es-CL').format(Math.round(value));
}

export function startOfCurrentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
