import type { DATABASE_STATUS, HEALTH_STATUS } from './health.constants.js';

export interface HealthResponse {
  status: typeof HEALTH_STATUS.ok;
  database: typeof DATABASE_STATUS.connected;
  timestamp: string;
}
export interface HealthErrorResponse {
  status: typeof HEALTH_STATUS.error;
  database: typeof DATABASE_STATUS.disconnected;
}
