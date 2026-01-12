import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SendEmailCaptchaDTO {
  @ApiProperty({
    description: '用户邮箱地址',
    example: 'user@example.com',
    format: 'email',
    required: true,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '验证码用途',
    example: 'register',
    enum: ['register', 'reset-password'],
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['register', 'reset-password'])
  purpose: string;
}
