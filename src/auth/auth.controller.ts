import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserRequestType } from 'src/common/interface/request-user.interface';

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

  @Post('api-key')
  @UseGuards(JwtAuthGuard)
  async newKey(@Req() req: UserRequestType): Promise<string> {
    return await this.authService.getNewApiKey(req.user._id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  profile(@Req() req: UserRequestType): any {
    return {
      _id: req.user?._id,
      name: req.user?.name,
      email: req.user?.email,
    };
  }
}
