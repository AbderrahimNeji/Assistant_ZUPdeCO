import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { FirebaseJwtGuard } from '../../auth/firebase-jwt.guard';
import { ContactFunctionsService } from './contact-functions.service';
import { CreateContactFunctionDto, UpdateContactFunctionDto, ContactFunctionResponseDto } from './dto/contact-function.dto';

interface ContactFunctionsAuthRequest {
  user: { companyId: string };
}

@ApiTags('Contact functions')
@ApiBearerAuth('Firebase')
@Controller('contact-functions')
@UseGuards(FirebaseJwtGuard)
export class ContactFunctionsController {
  constructor(private readonly contactFunctionsService: ContactFunctionsService) {}

  @Get()
  @ApiOperation({ summary: 'List contact functions for the current company' })
  @ApiResponse({ status: 200, type: ContactFunctionResponseDto, isArray: true })
  async findAll(@Request() req: ContactFunctionsAuthRequest): Promise<ContactFunctionResponseDto[]> {
    const companyId = req.user.companyId;
    return this.contactFunctionsService.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one contact function by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ContactFunctionResponseDto })
  async findOne(
    @Param('id') id: string,
    @Request() req: ContactFunctionsAuthRequest,
  ): Promise<ContactFunctionResponseDto> {
    const companyId = req.user.companyId;
    return this.contactFunctionsService.findOne(id, companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a contact function' })
  @ApiResponse({ status: 201, type: ContactFunctionResponseDto })
  async create(
    @Body() dto: CreateContactFunctionDto,
    @Request() req: ContactFunctionsAuthRequest,
  ): Promise<ContactFunctionResponseDto> {
    const companyId = req.user.companyId;
    return this.contactFunctionsService.create(companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a contact function' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ContactFunctionResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContactFunctionDto,
    @Request() req: ContactFunctionsAuthRequest,
  ): Promise<ContactFunctionResponseDto> {
    const companyId = req.user.companyId;
    return this.contactFunctionsService.update(id, companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact function' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  async delete(@Param('id') id: string, @Request() req: ContactFunctionsAuthRequest): Promise<void> {
    const companyId = req.user.companyId;
    return this.contactFunctionsService.delete(id, companyId);
  }
}
