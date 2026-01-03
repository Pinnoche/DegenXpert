import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  username: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Enter a correct email' })
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
