import {
  HEALTH_RESOURCE,
  HEALTH_STATUS,
  DATABASE_STATUS,
  type HealthResponse,
  type HealthErrorResponse,
} from '@ssc0536/common';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller(HEALTH_RESOURCE)
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: HEALTH_STATUS.ok,
        database: DATABASE_STATUS.connected,
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: HEALTH_STATUS.error,
        database: DATABASE_STATUS.disconnected,
      } satisfies HealthErrorResponse);
    }
  }
}
