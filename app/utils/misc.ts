/**
 * Safely extracts text content from a Response object.
 * Returns the content as a string if successful, or null if an error occurs while reading the body.
 *
 * Useful when you want to extract error messages from an API response without throwing
 * additional errors during body parsing (e.g., when the body has already been read,
 * or when the response isn't text).
 */
export async function safeText(res: Response): Promise<string | null> {
  try {
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Creates a delay for the specified number of milliseconds.
 *
 * @example
 * await sleep(5000); // Waits for 5 seconds (useful for testing loading states)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
