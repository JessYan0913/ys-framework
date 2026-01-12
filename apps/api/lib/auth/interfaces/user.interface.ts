export interface UserPayload {
  id: string | number;
  [key: string]: any;
}

export interface ResourcePayload {
  action: string;
  resource: string;
}

export type OAuthProvider = 'feishu';

export interface OAuthUserProfile {
  provider: OAuthProvider;
  providerUserId: string;
  unionId?: string;
  openId?: string;
  name?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  raw?: any;
}

export interface UserService<T extends UserPayload = UserPayload> {
  validateUser(username: string, password: string): T | Promise<T | null>;
  canAccess(user: T, permission: ResourcePayload): boolean | Promise<boolean>;

  findOrCreateByOAuth(profile: OAuthUserProfile): T | Promise<T>;
  findOrCreateByPhone(phone: string): T | Promise<T>;
}
