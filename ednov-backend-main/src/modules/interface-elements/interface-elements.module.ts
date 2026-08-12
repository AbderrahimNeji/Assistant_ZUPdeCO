import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterfaceElementsController } from './interface-elements.controller';
import { InterfaceElementsService } from './interface-elements.service';
import { InterfaceElement } from './entities/interface-element.entity';
import { RoleInterfaceElement } from './entities/role-interface-element.entity';
import { UserPreferencesModule } from '../user-preferences/user-preferences.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InterfaceElement, RoleInterfaceElement]),
    UserPreferencesModule,
  ],
  controllers: [InterfaceElementsController],
  providers: [InterfaceElementsService],
  exports: [InterfaceElementsService, TypeOrmModule],
})
export class InterfaceElementsModule {}
