import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordVO {
  @ApiProperty({
    description: '操作结果消息',
    example: '密码重置成功，请重新登录',
  })
  message: string;
}
