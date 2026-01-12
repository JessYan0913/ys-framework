import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class UploadChunkDto {
  @ApiProperty({ description: '上传ID' })
  @IsNotEmpty()
  @IsString()
  uploadId: string;

  @ApiProperty({ description: '文件Key' })
  @IsNotEmpty()
  @IsString()
  fileKey: string;

  @ApiProperty({ description: '分片编号（从1开始）' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  partNumber: number;
}
