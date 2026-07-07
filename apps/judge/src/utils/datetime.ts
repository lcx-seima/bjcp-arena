function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function formatFullDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`,
  ].join(" ");
}
