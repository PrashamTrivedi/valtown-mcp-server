/**
 * Safely extracts error message from unknown errors
 * @param error The error to extract a message from
 * @returns A string representation of the error
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }
    return String(error)
}
