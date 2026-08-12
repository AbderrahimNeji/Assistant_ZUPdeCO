import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterfaceElement } from '../../modules/interface-elements/entities/interface-element.entity';
import { RoleInterfaceElement } from '../../modules/interface-elements/entities/role-interface-element.entity';
import { VisibilityScopeResolverService } from './visibility-scope-resolver.service';
import { VisibilityScopeInterceptor } from './visibility-scope.interceptor';

/**
 * Global module that provides the visibility scope infrastructure:
 *  - VisibilityScopeResolverService  — injectable in any service
 *  - VisibilityScopeInterceptor      — injectable / usable as APP_INTERCEPTOR
 *
 * Imported once in AppModule; no need to import in feature modules.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([InterfaceElement, RoleInterfaceElement])],
  providers: [VisibilityScopeResolverService, VisibilityScopeInterceptor],
  exports: [VisibilityScopeResolverService, VisibilityScopeInterceptor],
})
export class VisibilityModule {}
