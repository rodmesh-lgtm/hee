import { Pool, type PoolClient } from "pg";
import { operationalErrorCategory } from "../app/lib/operational-error";

type ConnectCallback = Parameters<Pool["connect"]>[0];

export class PostgresPool extends Pool {
  override connect(): Promise<PoolClient>;
  override connect(callback: ConnectCallback): void;
  override connect(callback?: ConnectCallback): Promise<PoolClient> | void {
    if (!callback) {
      return new Promise((resolve, reject) => {
        this.connect((error, client) => {
          if (error) reject(error);
          else if (client) resolve(client);
          else reject(new Error("PostgreSQL pool did not return a connection"));
        });
      });
    }

    super.connect((error, client, release) => {
      if (error && !this.ending) {
        const category = operationalErrorCategory(error);
        const queueTimedOut = error.message === "timeout exceeded when trying to connect";
        const canRetry = queueTimedOut
          ? this.waitingCount === 0
          : category === "database_connection" || category === "database_timeout";

        // No client has been checked out yet. Retrying checkout cannot replay
        // a query or transaction, even when pool.query is executing a write.
        if (canRetry) {
          setTimeout(() => super.connect(callback), 100 + Math.random() * 100);
          return;
        }
      }

      callback(error, client, release);
    });
  }
}
