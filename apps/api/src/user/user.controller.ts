import { JWTAuthGuard } from '@lib/auth';
import { Body, Controller, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(JWTAuthGuard) // 所有用户接口都需要认证
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getProfile(@Request() req: any) {
    return req.user; // JWT 验证后的用户信息
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新当前用户信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateProfile(@Request() req: any, @Body() updateData: UpdateUserDto) {
    return this.userService.updateUser(req.user.id, updateData);
  }

  @Put('change-password')
  @ApiOperation({ summary: '修改密码' })
  @ApiResponse({ status: 200, description: '修改成功' })
  async changePassword(@Request() req: any, @Body() passwordData: ChangePasswordDto) {
    return this.userService.changePassword(req.user.id, passwordData);
  }
}
