import { Test, TestingModule } from '@nestjs/testing';

import { BenchmarkService } from './benchmark.service';
import { BenchmarkController } from './benchmark.controller';

describe('BenchmarkController', () => {
  let controller: BenchmarkController;
  const benchmarkService = {
    listDatasets: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BenchmarkController],
      providers: [{ provide: BenchmarkService, useValue: benchmarkService }],
    }).compile();

    controller = module.get(BenchmarkController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listDatasets should wrap BenchmarkService results', () => {
    benchmarkService.listDatasets.mockReturnValue(['core']);
    expect(controller.listDatasets()).toEqual({ datasets: ['core'] });
  });
});
