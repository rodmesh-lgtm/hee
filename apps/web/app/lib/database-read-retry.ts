import { operationalErrorCategory } from './operational-error';

/** One fresh read after a transient connection failure. Never wrap writes or transactions. */
export async function readDatabaseWithRetry<T>(
  read: () => Promise<T>,
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    const category = operationalErrorCategory(error);
    if (category !== 'database_connection' && category !== 'database_timeout') throw error;
    await wait(500);
    return read();
  }
}
