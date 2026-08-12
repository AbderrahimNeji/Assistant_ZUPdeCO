import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BenchmarkService } from './benchmark.service';
import { BenchmarkSummaryDto } from './dto/benchmark-summary.dto';
import { ExportBenchmarkDto } from './dto/export-benchmark.dto';
import { FilterBenchmarkDto } from './dto/filter-benchmark.dto';
import { RunBenchmarkDto } from './dto/run-benchmark.dto';

@ApiTags('Benchmark')
@Controller('benchmark')
export class BenchmarkController {
  constructor(
    private readonly benchmarkService: BenchmarkService,
  ) {}

  @Get('dashboard')
  @ApiExcludeEndpoint()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/html; charset=utf-8')
  getDashboard(): string {
    const dashboardPath = path.join(
      __dirname,
      'dashboard',
      'index.html',
    );
    return fs.readFileSync(dashboardPath, 'utf-8');
  }

  @Get('datasets')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List available benchmark datasets' })
  listDatasets() {
    return { datasets: this.benchmarkService.listDatasets() };
  }

  @Post('run')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Run benchmark against a dataset',
  })
  @ApiBody({ type: RunBenchmarkDto })
  @ApiResponse({
    status: 201,
    description: 'Benchmark completed and persisted',
    type: BenchmarkSummaryDto,
  })
  async run(
    @Request() req,
    @Body() body: RunBenchmarkDto,
  ) {
    return this.benchmarkService.runBenchmark(
      req.user.id,
      body.dataset,
    );
  }

  @Post('run-async')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Start a benchmark job and track progress asynchronously',
  })
  @ApiBody({ type: RunBenchmarkDto })
  async runAsync(
    @Request() req,
    @Body() body: RunBenchmarkDto,
  ) {
    return this.benchmarkService.startBenchmarkJob(
      req.user.id,
      body.dataset,
    );
  }

  @Get('jobs/:jobId/progress')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get progress for an async benchmark job',
  })
  async jobProgress(
    @Request() req,
    @Param('jobId') jobId: string,
  ) {
    return this.benchmarkService.getJobProgress(jobId, req.user.id);
  }

  @Get('results')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List all benchmark runs',
  })
  @ApiResponse({
    status: 200,
    type: [BenchmarkSummaryDto],
  })
  async findAllResults(
    @Request() req,
    @Query() filters: FilterBenchmarkDto,
  ) {
    return this.benchmarkService.findAllResults(req.user.id, filters);
  }

  @Get('history')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Dashboard history series',
  })
  async history(@Request() req, @Query() filters: FilterBenchmarkDto) {
    return this.benchmarkService.getDashboardHistory(req.user.id, filters);
  }

  @Get(':id/export')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Export a benchmark run as JSON, CSV, or PDF',
  })
  @ApiParam({ name: 'id', description: 'BenchmarkRun id' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['json', 'csv', 'pdf'],
  })
  async exportRun(
    @Request() req,
    @Param('id') id: string,
    @Query() query: ExportBenchmarkDto,
    @Res() res: Response,
  ) {
    const exported = await this.benchmarkService.exportRun(
      id,
      req.user.id,
      query.format ?? 'json',
    );

    res.setHeader('Content-Type', exported.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.filename}"`,
    );
    return res.send(exported.body);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get a benchmark run by id',
  })
  @ApiParam({ name: 'id', description: 'BenchmarkRun id' })
  @ApiResponse({
    status: 200,
    type: BenchmarkSummaryDto,
  })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.benchmarkService.findOne(id, req.user.id);
  }
}
