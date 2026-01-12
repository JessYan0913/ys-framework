import { ApiProperty } from '@nestjs/swagger';

export class SendEmailCaptchaVO {
  @ApiProperty({
    description: '验证码ID',
    example: 'uuid-string',
  })
  id: string;
}
