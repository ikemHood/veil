export function errorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof Error && caught.message) return caught.message;
  if (typeof caught === "string" && caught.trim()) return caught;
  if (!caught || typeof caught !== "object") return fallback;

  const record = caught as Record<string, unknown>;
  for (const key of ["message", "error", "status", "detail"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  const cause = record.cause;
  if (cause) {
    const causeMessage: string = errorMessage(cause, "");
    if (causeMessage) return causeMessage;
  }

  try {
    const serialized = JSON.stringify(record);
    return serialized && serialized !== "{}" ? serialized : fallback;
  } catch {
    return fallback;
  }
}
