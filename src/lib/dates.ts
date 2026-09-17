export const todayISO = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const isoDay = (value: Date | string | number): string => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return todayISO();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
