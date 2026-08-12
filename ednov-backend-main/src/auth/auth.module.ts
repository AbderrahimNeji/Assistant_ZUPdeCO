import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/entities/user-role.entity';
import { Role } from '../modules/roles/entities/role.entity';
import { RoleGroupEntity } from '../modules/roles/entities/role-group.entity';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, Role, RoleGroupEntity]),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
