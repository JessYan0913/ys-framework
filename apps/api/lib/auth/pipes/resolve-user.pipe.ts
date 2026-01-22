import { Inject, Injectable, PipeTransform } from '@nestjs/common';
import { UserService } from '../interfaces/user.interface';

@Injectable()
export class ResolveUserPipe implements PipeTransform {
  constructor(
    @Inject('UserService') private readonly userService: UserService,
  ) {}

  async transform(value: any) {
    if (!value?.id) {
      return value;
    }
    const user = await this.userService.findById(String(value.id));
    return user;
  }
}
