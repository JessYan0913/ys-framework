/// <reference types="node" />

/**
 * 兑换码配置类型
 */
export interface RedeemCodeConfig {
  PAYLOAD_LENGTH: number;
  CHECKSUM_LENGTH: number;
  OUTPUT_LENGTH: number;
  MAX_SCHEME_ID: number;
  VERSION: number;
}

/**
 * 解析后的兑换码载荷
 */
export interface ParsedRedeemCodePayload {
  version: number;
  schemeId: number;
  payload: Buffer;
  checksum: Buffer;
}

/**
 * 方案信息基础类型
 */
export interface SchemeInfo {
  schemeKey: string;
  schemeId: number;
  displayName?: string | null;
  planLevel?: string | null;
}

/**
 * 完整方案信息
 */
export interface FullSchemeInfo extends SchemeInfo {
  months: number;
  monthlyPoints: number | null;
  bonusPoints: number | null;
  metadata: Record<string, unknown> | null;
}

/**
 * 解码结果
 */
export interface DecodeResult {
  version: number;
  scheme: string;
  schemeDisplayName?: string | null;
  planLevel?: string | null;
  schemeId: number;
  checksumValid: boolean;
  randomBytesHex: string;
  payloadHex: string;
  checksumHex: string;
}

/**
 * 方案查找表类型
 */
export type SchemeLookup = Map<number, SchemeInfo>;

/**
 * 方案映射表类型
 */
export type SchemeMap = Record<string, FullSchemeInfo>;
