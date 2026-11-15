import { isHealthResponse, type HealthResponse } from '@ssc0536/common';
import { endpoints } from '@/services/endpoints';
import { apiClient } from '@/services/http';

export const healthService = {
  async get(signal?: AbortSignal): Promise<HealthResponse> {
    const data = await apiClient.get(endpoints.health, { signal });
    if (!isHealthResponse(data)) {
      throw new Error('A API retornou uma resposta inesperada.');
    }
    return data;
  },
};
