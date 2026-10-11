import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('login should delegate to AuthService', async () => {
    const dto = { email: 'demo@zupdeco.fr', password: 'Password123' };
    authService.login.mockResolvedValue({ access_token: 'token' });

    await expect(controller.login(dto)).resolves.toEqual({
      access_token: 'token',
    });
    expect(authService.login).toHaveBeenCalledWith(dto);
  });
});
