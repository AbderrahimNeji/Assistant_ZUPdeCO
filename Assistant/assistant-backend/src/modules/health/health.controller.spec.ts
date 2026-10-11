import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { HealthService } from './health.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const healthService = {
    check: jest.fn(),
    liveness: jest.fn(),
    readiness: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get(HealthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('live should return the liveness payload', () => {
    healthService.liveness.mockReturnValue({ status: 'alive' });
    expect(controller.live()).toEqual({ status: 'alive' });
  });

  it('ready should throw when the service is not ready', async () => {
    healthService.readiness.mockResolvedValue({ status: 'not_ready' });

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
