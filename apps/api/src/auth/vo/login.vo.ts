import { ApiProperty } from '@nestjs/swagger';

export class OidcInfo {
  @ApiProperty({
    description: 'OIDC ID Token，用于 NocoDB 等第三方系统认证',
    type: String,
    required: false,
  })
  idToken?: string;

  @ApiProperty({
    description: 'OIDC 授权 URL，可直接跳转到第三方系统',
    type: String,
    required: false,
  })
  authorizeUrl?: string;
}

export class LoginUserVO {
  @ApiProperty({
    description: '用户ID',
    type: String,
  })
  id: string | number;

  @ApiProperty({
    description: '邮箱',
    type: String,
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: '用户名',
    type: String,
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: '手机号',
    type: String,
    required: false,
  })
  phone?: string;
}

export class LoginVO {
  @ApiProperty({
    description: '用户信息',
    type: LoginUserVO,
  })
  user: LoginUserVO;

  @ApiProperty({
    description: '访问令牌',
    type: String,
  })
  accessToken: string;

  @ApiProperty({
    description: '刷新令牌',
    type: String,
  })
  refreshToken: string;

  @ApiProperty({
    description: 'OIDC 相关信息，用于第三方系统免登录',
    type: OidcInfo,
    required: false,
  })
  oidc?: OidcInfo;
}
