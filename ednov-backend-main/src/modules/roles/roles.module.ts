import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { RoleGroupEntity } from './entities/role-group.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { AuditModule } from '../audit/audit.module';
import { RoleInterfaceElement } from '../interface-elements/entities/role-interface-element.entity';
import { InterfaceElement } from '../interface-elements/entities/interface-element.entity';
import { RoleInterfaceBindingsService } from './role-interface-bindings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, RoleGroupEntity, RoleInterfaceElement, InterfaceElement]),
    AuditModule,
  ],
  controllers: [RolesController],
  providers: [RolesService, RoleInterfaceBindingsService],
  exports: [TypeOrmModule, RolesService, RoleInterfaceBindingsService],
})
export class RolesModule {}