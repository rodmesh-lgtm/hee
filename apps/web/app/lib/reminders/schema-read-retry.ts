import { operationalErrorCategory } from '../operational-error';

/** Only for the read-only schema probe: never wrap scheduling, delivery or writes. */
export async function readSchemaWithRetry<T>(read: () => Promise<T>, wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))): Promise<T> {
  try {
    return await read();
  } catch (error) {
    const category = operationalErrorCategory(error);
    if (category !== 'database_timeout' && category !== 'database_connection') throw error;
    await wait(500);
    // One fresh read only. Persistent failures propagate; false readiness stays false.
    return read();
  }
}
