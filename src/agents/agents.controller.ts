import { Controller, Get, Query } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  getHello() {
    return this.agentsService.getHello();
  }

  //   @Get('token/:address')
  //   getToken(@Param('address') address: string) {
  //     return this.agentsService.getTokenStats(address);
  //   }

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
}
