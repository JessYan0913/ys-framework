import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyEmailCaptchaDTO {
  @ApiProperty({
    description: '验证码唯一标识（可选，会从Cookie中自动获取）',
    example: 'abc123def456',
    required: false,
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: '验证用途',
    example: 'register',
    enum: ['register', 'reset-password'],
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  purpose: 'register' | 'reset-password';
}
