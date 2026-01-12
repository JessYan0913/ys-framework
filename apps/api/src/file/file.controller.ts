import { JWTAuthGuard } from '@lib/auth';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AbortUploadDto, CompleteUploadDto, InitiateUploadDto, UploadChunkDto } from './dto';
import { FileService } from './file.service';
import { UploadedFile as IUploadedFile } from './types/uploaded-file.interface';

@ApiTags('文件管理')
@Controller('files')
@UseGuards(JWTAuthGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload/initiate')
  @ApiOperation({ summary: '初始化分片上传' })
  @ApiResponse({ status: 201, description: '初始化成功，返回uploadId和分片信息' })
  async initiateUpload(@Body() dto: InitiateUploadDto) {
    return this.fileService.initiateUpload({
      filename: dto.filename,
      fileSize: dto.fileSize,
      contentType: dto.contentType,
      chunkSize: dto.chunkSize,
    });
  }

  @Post('upload/chunk')
  @ApiOperation({ summary: '上传文件分片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        uploadId: { type: 'string', description: '上传ID' },
        fileKey: { type: 'string', description: '文件Key' },
        partNumber: { type: 'number', description: '分片编号' },
        file: { type: 'string', format: 'binary', description: '分片文件' },
      },
    },
  })
  @ApiResponse({ status: 201, description: '分片上传成功' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadChunk(@Body() dto: UploadChunkDto, @UploadedFile() file: IUploadedFile) {
    return this.fileService.uploadChunk({
      uploadId: dto.uploadId,
      fileKey: dto.fileKey,
      partNumber: Number(dto.partNumber),
      data: file.buffer,
    });
  }

  @Post('upload/complete')
  @ApiOperation({ summary: '完成分片上传' })
  @ApiResponse({ status: 201, description: '上传完成，返回文件信息' })
  async completeUpload(@Body() dto: CompleteUploadDto) {
    return this.fileService.completeUpload({
      uploadId: dto.uploadId,
      fileKey: dto.fileKey,
    });
  }

  @Post('upload/abort')
  @ApiOperation({ summary: '取消分片上传' })
  @ApiResponse({ status: 200, description: '上传已取消' })
  async abortUpload(@Body() dto: AbortUploadDto) {
    await this.fileService.abortUpload({
      uploadId: dto.uploadId,
      fileKey: dto.fileKey,
    });
    return { message: '上传已取消' };
  }

  @Get('upload/progress/:uploadId')
  @ApiOperation({ summary: '获取上传进度' })
  @ApiResponse({ status: 200, description: '返回上传进度信息' })
  async getUploadProgress(@Param('uploadId') uploadId: string) {
    return this.fileService.getUploadProgress(uploadId);
  }

  @Post('upload/simple')
  @ApiOperation({ summary: '简单文件上传（小文件）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: '文件' },
      },
    },
  })
  @ApiResponse({ status: 201, description: '上传成功' })
  @UseInterceptors(FileInterceptor('file'))
  async simpleUpload(@UploadedFile() file: IUploadedFile) {
    return this.fileService.simpleUpload({
      filename: file.originalname,
      data: file.buffer,
      contentType: file.mimetype,
    });
  }

  @Get(':fileKey/url')
  @ApiOperation({ summary: '获取文件访问URL' })
  @ApiResponse({ status: 200, description: '返回文件URL' })
  async getFileUrl(@Param('fileKey') fileKey: string) {
    const url = await this.fileService.getFileUrl(fileKey);
    return { url };
  }

  @Get(':fileKey/download')
  @ApiOperation({ summary: '下载文件' })
  @ApiResponse({ status: 200, description: '返回文件流' })
  async downloadFile(@Param('fileKey') fileKey: string, @Res() res: Response) {
    const stream = await this.fileService.getFileStream(fileKey);
    stream.pipe(res);
  }

  @Delete(':fileKey')
  @ApiOperation({ summary: '删除文件' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteFile(@Param('fileKey') fileKey: string) {
    await this.fileService.deleteFile(fileKey);
    return { message: '文件已删除' };
  }
}
