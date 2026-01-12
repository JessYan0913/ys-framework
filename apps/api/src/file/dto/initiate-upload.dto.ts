import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class InitiateUploadDto {
  @ApiProperty({ description: '文件名' })
  @IsNotEmpty()
  @IsString()
  filename: string;

  @ApiProperty({ description: '文件大小（字节）' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiProperty({ description: '文件类型', required: false })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiProperty({ description: '分片大小（字节）', required: false, default: 5242880 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  chunkSize?: number;
}
