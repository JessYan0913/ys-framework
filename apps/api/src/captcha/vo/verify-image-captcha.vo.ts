import { ApiProperty } from '@nestjs/swagger';

export class VerifyImageCaptchaVO {
  @ApiProperty({
    description: '验证码唯一标识',
    example: 'abc123def456',
    required: true,
  })
  id: string;

  @ApiProperty({
    description: '验证成功后的令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;
}
