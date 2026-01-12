import { UserService as IUserService, OAuthUserProfile, ResourcePayload, UserPayload } from '@lib/auth';
import { BadRequestException, Injectable } from '@nestjs/common';
import { User, user, userAuthIdentities } from '@ys/database';
import { DrizzleService } from '@ys/database/nestjs';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class UserService implements IUserService<UserPayload> {
  constructor(private readonly drizzle: DrizzleService) {}

  async validateUser(username: string, password: string): Promise<UserPayload | null> {
    const normalizedUsername = (username || '').trim().toLowerCase();
    const normalizedPassword = (password || '').trim();

    const result = await this.drizzle.db.select().from(user).where(eq(user.email, normalizedUsername)).limit(1);

    if (result.length === 0) {
      return null;
    }

    const userData = result[0];

    const storedPassword = userData.password || '';
    const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);

    if (isBcryptHash) {
      const passwordsMatch = await bcrypt.compare(normalizedPassword, storedPassword);
      if (!passwordsMatch) {
        return null;
      }
    } else {
      if (normalizedPassword !== storedPassword) {
        return null;
      }

      const hashedPassword = await bcrypt.hash(normalizedPassword, 10);
      await this.drizzle.db.update(user).set({ password: hashedPassword }).where(eq(user.id, userData.id));
    }

    return this.toUserPayload(userData);
  }

  async canAccess(_user: UserPayload, _resource: ResourcePayload): Promise<boolean> {
    // Implement your authorization logic here
    return true;
  }

  async findOrCreateByOAuth(profile: OAuthUserProfile): Promise<UserPayload> {
    // Check if identity already exists
    const existingIdentity = await this.drizzle.db
      .select()
      .from(userAuthIdentities)
      .where(
        and(
          eq(userAuthIdentities.provider, profile.provider),
          eq(userAuthIdentities.providerUserId, profile.providerUserId),
        ),
      )
      .limit(1);

    if (existingIdentity.length > 0) {
      // Identity exists, get the user
      const userResult = await this.drizzle.db
        .select()
        .from(user)
        .where(eq(user.id, existingIdentity[0].userId))
        .limit(1);

      if (userResult.length > 0) {
        return this.toUserPayload(userResult[0]);
      }
    }

    // Create new user
    const newUser = await this.drizzle.db
      .insert(user)
      .values({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      })
      .returning();

    // Create identity link
    await this.drizzle.db.insert(userAuthIdentities).values({
      userId: newUser[0].id,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      unionId: profile.unionId,
      openId: profile.openId,
      raw: JSON.stringify(profile.raw),
    });

    return this.toUserPayload(newUser[0]);
  }

  async findOrCreateByPhone(phone: string): Promise<UserPayload> {
    // Check if user with phone exists
    const existingUser = await this.drizzle.db.select().from(user).where(eq(user.phone, phone)).limit(1);

    if (existingUser.length > 0) {
      return this.toUserPayload(existingUser[0]);
    }

    // Create new user
    const newUser = await this.drizzle.db.insert(user).values({ email: '', phone }).returning();

    return this.toUserPayload(newUser[0]);
  }

  async findById(id: string): Promise<UserPayload | null> {
    const result = await this.drizzle.db.select().from(user).where(eq(user.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.toUserPayload(result[0]);
  }

  async updateUser(id: string, updateData: { name?: string; email?: string; phone?: string }) {
    const [updatedUser] = await this.drizzle.db.update(user).set(updateData).where(eq(user.id, id)).returning();

    if (!updatedUser) {
      throw new BadRequestException('用户不存在');
    }

    return this.toUserPayload(updatedUser);
  }

  async changePassword(id: string, passwordData: { currentPassword: string; newPassword: string }) {
    // 获取用户当前密码
    const [userData] = await this.drizzle.db.select().from(user).where(eq(user.id, id)).limit(1);

    if (!userData) {
      throw new BadRequestException('用户不存在');
    }

    // 使用bcrypt验证当前密码
    const currentPasswordMatch = await bcrypt.compare(passwordData.currentPassword, userData.password || '');
    if (!currentPasswordMatch) {
      throw new BadRequestException('当前密码错误');
    }

    // 使用bcrypt加密新密码
    const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, 10);

    // 更新密码
    await this.drizzle.db.update(user).set({ password: hashedNewPassword }).where(eq(user.id, id));

    return { message: '密码修改成功' };
  }

  private toUserPayload(user: User): UserPayload {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    };
  }
}
