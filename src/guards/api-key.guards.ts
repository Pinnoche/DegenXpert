import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserService } from 'src/user/user.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    private readonly userService: UserService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const partnerApiKey = this.config.get<string>('DMJ_API_KEY');
    const apiKeyHeader = request.headers['x-api-key'];

    const apiKey = typeof apiKeyHeader === 'string' ? apiKeyHeader : undefined;

    if (!apiKey) {
      throw new UnauthorizedException('API key missing');
    }
    if (partnerApiKey && partnerApiKey === apiKey) {
      request['isPartner'] = 'partner';
      return true;
    }

    const hash = crypto
      .createHash('sha256')
      .update(apiKey.toString())
      .digest('hex');

    const user = await this.userService.getUserByKey(hash);

    if (!user) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    if (user && user.apiKeyRevoked) {
      throw new UnauthorizedException('API Key access has been revoked');
    }

    request['user'] = user;
    return true;
  }
}
