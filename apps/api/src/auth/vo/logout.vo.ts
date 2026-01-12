import { ApiProperty } from '@nestjs/swagger';

export class LogoutVO {
  @ApiProperty({
    description: '登出结果消息',
    type: String,
  })
  message: string;
}
