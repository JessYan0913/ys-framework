import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateImageCaptchaDTO {
  @ApiProperty({
    description: '验证码用途，用于区分不同场景的验证码',
    example: 'register',
    enum: ['login', 'register', 'reset_password', 'other'],
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  purpose: string;

  @ApiProperty({
    description: '背景图片宽度（像素）',
    example: 300,
    minimum: 200,
    maximum: 800,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  bgWidth?: number;

  @ApiProperty({
    description: '背景图片高度（像素）',
    example: 200,
    minimum: 150,
    maximum: 600,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  bgHeight?: number;

  @ApiProperty({
    description: '拼图宽度（像素）',
    example: 60,
    minimum: 40,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiProperty({
    description: '拼图高度（像素）',
    example: 60,
    minimum: 40,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  height?: number;
}
