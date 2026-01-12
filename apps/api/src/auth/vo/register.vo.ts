import { ApiProperty } from '@nestjs/swagger';

export class RegisterVO {
  @ApiProperty({
    description: '注册结果消息',
    type: String,
    example: '注册成功',
  })
  message: string;

  @ApiProperty({
    description: '邮箱',
    type: String,
  })
  email: string;
}
