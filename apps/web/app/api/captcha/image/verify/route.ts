import { NextRequest, NextResponse } from 'next/server';

const AUTH_API_URL = process.env.AUTH_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 转发请求到外部API
    const response = await fetch(`${AUTH_API_URL}/captcha/image/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || '验证码验证失败' }, { status: response.status });
    }

    // 如果后端返回了Set-Cookie头，需要转发
    const setCookieHeader = response.headers.get('set-cookie');
    console.log('Set-Cookie header from external API:', setCookieHeader); // 调试日志

    const nextResponse = NextResponse.json(data);

    if (setCookieHeader) {
      // 转发Cookie设置
      nextResponse.headers.set('Set-Cookie', setCookieHeader);
      console.log('Cookie forwarded to client'); // 调试日志
    } else {
      console.log('No Set-Cookie header received from external API'); // 调试日志
    }

    return nextResponse;
  } catch (error) {
    console.error('Verify captcha error:', error);
    return NextResponse.json({ error: '网络请求错误' }, { status: 500 });
  }
}
