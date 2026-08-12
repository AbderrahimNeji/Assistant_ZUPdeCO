import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StudentStatusHistoryService } from './student-status-history.service';
import { StudentStatusHistory } from './entities/student-status-history.entity';

describe('StudentStatusHistoryService', () => {
  let service: StudentStatusHistoryService;
  let repo: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((row: unknown) => row),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentStatusHistoryService,
        {
          provide: getRepositoryToken(StudentStatusHistory),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get(StudentStatusHistoryService);
  });

  it('persists creation row with null oldStatus', async () => {
    await service.record({
      studentUserId: 'stu-1',
      updatedByUserId: 'actor-1',
      oldStatus: null,
      newStatus: 'registered',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studentUserId: 'stu-1',
        updatedById: 'actor-1',
        oldStatus: null,
        newStatus: 'registered',
      }),
    );
    expect(repo.save).toHaveBeenCalled();
  });

  it('persists transition when both statuses are student account statuses', async () => {
    await service.record({
      studentUserId: 'stu-1',
      updatedByUserId: null,
      oldStatus: 'registered',
      newStatus: 'accompanied',
    });

    expect(repo.save).toHaveBeenCalled();
  });

  it('skips save when null oldStatus but invalid newStatus', async () => {
    await service.record({
      studentUserId: 'stu-1',
      updatedByUserId: null,
      oldStatus: null,
      newStatus: 'active',
    });

    expect(repo.save).not.toHaveBeenCalled();
  });
});
