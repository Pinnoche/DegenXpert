import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Res,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserRequestType } from 'src/common/interface/request-user.interface';
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() body: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ token: string; apiKey: string }> {
    const result = await this.authService.signup(body);
    res.cookie('token', result.token, {
      httpOnly: true,
      expires: new Date(Date.now() + 3600000),
    });
    return result;
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ token: string }> {
    const token = await this.authService.login(body);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 1000,
      // expires: new Date(Date.now() + 3600000),
    });
    return token;
  }

  @Post('refresh-token')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Req() req: UserRequestType): Promise<{ token: string }> {
    return await this.authService.refreshToken(req.user.token);
  }

  @Post('api-key')
  @UseGuards(JwtAuthGuard)
  async newKey(@Req() req: UserRequestType): Promise<string> {
    return await this.authService.getNewApiKey(req.user._id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  profile(@Req() req: UserRequestType): any {
    if (!req.user) {
      throw new NotFoundException('User not found');
    }
    return {
      _id: req.user?._id,
      username: req.user?.username,
      email: req.user?.email,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    return { message: 'Logged out successfully' };
  }
}
