import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '👋 Hello from DMJ!. <br /> <br />DegenXpert is a Solana-focused AI crypto agent. It interacts with users to retrieve real-time token stats, top holder data, wallet tracking, and new token launches for degen traders.';
  }
}
