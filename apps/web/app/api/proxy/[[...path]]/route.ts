import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth';

const AUTH_API_URL = process.env.AUTH_API_URL || 'http://127.0.0.1:3001';

async function proxyHandler(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    // 1. 解析目标路径
    const { path: pathParams } = await params;
    const path = pathParams?.join("/") || "";
    const searchParams = req.nextUrl.search;
    const targetUrl = `${AUTH_API_URL}/${path}${searchParams}`;

    // 2. 尝试获取用户会话（非强制）
    let accessToken: string | undefined;
    try {
        const session = await auth();
        if (session?.accessToken) {
            accessToken = session.accessToken;
        }
    } catch (error) {
        // 仅记录警告，不阻断请求
        console.warn("[BFF Proxy] Auth check skipped:", error);
    }

    // 3. 准备请求头
    const requestHeaders = new Headers(req.headers);

    // 如果有有效的 AccessToken，注入 Authorization 头
    // 否则保留原始请求头（允许匿名访问或客户端自带 Token）
    if (accessToken) {
        requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    }

    // 清除可能导致冲突的 Header
    requestHeaders.delete("host");
    requestHeaders.delete("connection");

    // 添加日志记录
    console.log(`[BFF Proxy] ${req.method} ${targetUrl} (Authenticated: ${!!accessToken})`);

    try {
        // 4. 发起转发请求
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: requestHeaders,
            // 如果是 GET/HEAD，不能包含 body
            body: ["GET", "HEAD"].includes(req.method) ? null : req.body,
            // @ts-ignore: duplex 是 Web Stream 标准，Node 环境 fetch 需要此参数
            duplex: "half",
        });

        // 5. 处理响应头
        const responseHeaders = new Headers(response.headers);

        // 如果 NestJS 返回了 set-cookie，将其透传给浏览器
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) {
            responseHeaders.set("set-cookie", setCookie);
        }

        // 6. 返回响应（支持流式输出）
        return new NextResponse(response.body, {
            status: response.status,
            headers: responseHeaders,
        });

    } catch (error: any) {
        console.error("BFF Proxy Error:", error);
        return NextResponse.json(
            { message: "Proxy connection failed", error: error.message },
            { status: 502 }
        );
    }
}

// 导出所有支持的方法
export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const DELETE = proxyHandler;
export const PATCH = proxyHandler;
