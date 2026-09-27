// <input type="datetime-local"> works in local time without a zone: "YYYY-MM-DDTHH:mm".
export function toLocalInput(seconds: number) {
  const d = new Date(seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string) {
  return Math.floor(new Date(value).getTime() / 1000);
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
