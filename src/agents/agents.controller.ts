import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { Response } from 'express';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  getHello() {
    return this.agentsService.getHello();
  }

  @Post('ask')
  async ask(@Body('question') question: string) {
    if (!question) {
      throw new Error('Question is required');
    }
    return await this.agentsService.askAgent(question);
  }

  @Post('stream')
  async stream(@Body('question') question: string, @Res() res: Response) {
    res.setHeader('content-type', 'text/event-stream');
    res.setHeader('cache-control', 'no-cache');
    res.setHeader('connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE with client
    if (!question) {
      throw new Error('Question is required');
    }
    return await this.agentsService.streamAgent(question);
  }

  @Get('top-holders')
  async getTopHolders(
    @Query('address') address: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    if (!address) {
      return { error: 'Missing required query param: address' };
    }

    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.agentsService.getTopHolders(address, limitNum);
  }

  @Get('token')
  async getToken(@Query('ca') ca: string) {
    return this.agentsService.getTokenData(ca);
  }

  @Get('gd-tokens')
  async getGraduatedTokens(@Query('limit') limit?: string): Promise<any> {
    const limitNum = limit ? parseInt(limit, 20) : 20;
    return this.agentsService.getGraduatedTokens(limitNum);
  }

  @Get('history')
  async getSolanaWalletSwapHistory(
    @Query('wallet') wallet: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    if (!wallet) {
      return { error: 'Missing required query param: wallet address' };
    }
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.agentsService.getSolanaWalletSwapHistory(wallet, limitNum);
  }
}
