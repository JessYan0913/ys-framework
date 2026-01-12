import { NextRequest, NextResponse } from 'next/server';

const AUTH_API_URL = process.env.AUTH_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 获取客户端传递的Cookie - 用于调试
    const cookieHeader = request.headers.get('cookie');

    // 转发请求到外部API
    const response = await fetch(`${AUTH_API_URL}/captcha/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 转发Cookie
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || '邮件发送失败' }, { status: response.status });
    }

    // 如果后端返回了Set-Cookie头，需要转发
    const setCookieHeader = response.headers.get('set-cookie');

    const nextResponse = NextResponse.json(data);

    if (setCookieHeader) {
      // 转发Cookie设置
      nextResponse.headers.set('Set-Cookie', setCookieHeader);
    }

    return nextResponse;
  } catch (error) {
    console.error('Send email captcha error:', error);
    return NextResponse.json({ error: '网络请求错误' }, { status: 500 });
  }
}
