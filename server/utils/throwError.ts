/**
 * Centralized error helper used across the project.
 * Matches the existing JS behavior.
 */
export default function throwError(message: string, statusCode: number) {
  const error: any = new Error(message);
  error.statusCode = statusCode;
  return error;
}
