import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenVO {
  @ApiProperty({
    description: '访问令牌',
    type: String,
  })
  accessToken: string;
}
