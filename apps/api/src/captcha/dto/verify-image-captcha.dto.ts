import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class VerifyImageCaptchaDTO {
  @ApiProperty({
    description: '验证码唯一标识',
    example: 'abc123def456',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    description: '拼图最终X坐标（像素）',
    example: 150,
    minimum: 0,
    maximum: 800,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  x: number;

  @ApiProperty({
    description: '拼图最终Y坐标（像素）',
    example: 100,
    minimum: 0,
    maximum: 600,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  y: number;

  @ApiProperty({
    description: '滑块偏移量（像素）',
    example: 145,
    minimum: 0,
    maximum: 200,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  sliderOffsetX: number;

  @ApiProperty({
    description: '拖拽总时长（毫秒）',
    example: 1500,
    minimum: 100,
    maximum: 10000,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  duration: number;

  @ApiProperty({
    description: '拖拽轨迹坐标数组 [[x1,y1], [x2,y2], ...]',
    example: [
      [10, 100],
      [20, 102],
      [30, 101],
      [145, 100],
    ],
    minItems: 10,
    required: true,
  })
  @IsNotEmpty()
  @IsArray()
  trail: number[][];
}
