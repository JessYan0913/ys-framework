import { ApiProperty } from '@nestjs/swagger';

export class CreateImageCaptchaVO {
  @ApiProperty({
    description: '验证码唯一标识',
    example: 'abc123def456',
    required: true,
  })
  id: string;

  @ApiProperty({
    description: '背景图片URL',
    example: 'data:image/png;base64,iVBORw0KGgo...',
    required: true,
  })
  bgUrl: string;

  @ApiProperty({
    description: '拼图图片URL',
    example: 'data:image/png;base64,iVBORw0KGgo...',
    required: true,
  })
  puzzleUrl: string;
}
