import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];

    const path = request.path;
    const excludedPath = ['/', '/api/v1'];
    if (excludedPath.includes(path)) {
      return true;
    }

    if (!apiKey || apiKey !== process.env.DMJ_API_KEY) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
