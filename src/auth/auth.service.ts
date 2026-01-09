import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from './schema/user.schema';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { SignupDto } from './dto/signup.dto';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}
  async signup(payload: SignupDto): Promise<{ token: string; apiKey: string }> {
    const { username, email, password } = payload;
    const existingUser = await this.userModel.findOne({ email });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    const hash = await bcrypt.hash(password, 10);
    const apiKey = randomBytes(32).toString('hex');
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    const newUser = await this.userModel.create({
      username,
      email,
      password: hash,
      apiKey: hashedKey,
      apiKeyRevoked: false,
    });

    const data = await this.generateJwt(newUser);
    const result = { token: data?.token, apiKey };
    return result;
  }

  async login(payload: LoginDto): Promise<{ token: string }> {
    const { email, password } = payload;
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new ConflictException('User not Found!');
    }
    const isPassword = await bcrypt.compare(password, user.password);
    if (!isPassword) {
      throw new NotFoundException('Invalid Email or Password');
    }
    return await this.generateJwt(user);
  }

  async refreshToken(token: string): Promise<{ token: string }> {
    const payload: { _id: string; email: string } =
      await this.jwtService.verifyAsync(token);
    const user = await this.userModel.findById(payload._id);
    if (!user) {
      throw new NotFoundException('User Not Found');
    }
    return await this.generateJwt(user);
  }

  async getNewApiKey(userId: string): Promise<string> {
    const apiKey = randomBytes(32).toString('hex');
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        apiKey: hashedKey,
        apiKeyRevoked: false,
      },
      { new: true },
    );
    if (!user) {
      throw new NotFoundException('user not found');
    }

    return apiKey;
  }

  private async generateJwt(user: User): Promise<{ token: string }> {
    const payload = {
      _id: user._id,
      email: user.email,
      username: user.username,
    };
    return {
      token: await this.jwtService.signAsync(payload),
    };
  }
}
