import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CompleteUploadDto {
  @ApiProperty({ description: '上传ID' })
  @IsNotEmpty()
  @IsString()
  uploadId: string;

  @ApiProperty({ description: '文件Key' })
  @IsNotEmpty()
  @IsString()
  fileKey: string;
}
