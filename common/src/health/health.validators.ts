import { DATABASE_STATUS, HEALTH_STATUS } from './health.constants.js';
import type { HealthResponse } from './health.types.js';

export function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    value.status === HEALTH_STATUS.ok &&
    'database' in value &&
    value.database === DATABASE_STATUS.connected &&
    'timestamp' in value &&
    typeof value.timestamp === 'string'
  );
}
