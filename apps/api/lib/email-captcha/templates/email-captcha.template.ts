export interface EmailCaptchaTemplateData {
  purposeText: string;
  purposeAction: string;
  code: string;
  ttlMinutes: number;
}

export function generateEmailCaptchaHtml(data: EmailCaptchaTemplateData): string {
  const { purposeText, purposeAction, code, ttlMinutes } = data;
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${purposeText}验证码</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #333333;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .email-header {
      background: linear-gradient(135deg, #000000 0%, #333333 100%);
      background-color: #000000;
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 300;
      letter-spacing: -0.5px;
    }
    .email-body {
      padding: 50px 40px;
      line-height: 1.6;
      text-align: center;
    }
    .email-body p {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 300;
    }
    .code-wrapper {
      margin: 40px 0;
    }
    .verification-code {
      display: inline-block;
      background: linear-gradient(135deg, #000000 0%, #333333 100%);
      background-color: #000000;
      color: #ffffff;
      font-size: 36px;
      font-weight: 300;
      letter-spacing: 8px;
      padding: 20px 40px;
      border-radius: 15px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    }
    .info-box {
      background-color: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
      font-size: 16px;
      color: #666666;
      border: none;
      margin-top: 30px;
    }
    .info-box p {
      margin: 0 0 10px 0;
    }
    .info-box p:last-child {
      margin-bottom: 0;
    }
    .email-footer {
      text-align: center;
      padding: 30px;
      font-size: 14px;
      color: #999999;
      background-color: #f5f5f5;
      border-top: none;
    }
    .email-footer a {
      color: #000000;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header" style="background-color: #000000; color: #ffffff;">
      <h1 style="color: #ffffff;">Si-Me™ Engineer Agent</h1>
    </div>
    <div class="email-body">
      <p>亲爱的用户，您好！</p>
      <p>为了您的安全，我们为您生成了${purposeText}验证码：</p>
      <div class="code-wrapper">
        <div class="verification-code" style="background-color: #000000; color: #ffffff;">${code}</div>
      </div>
      <div class="info-box">
        <p>此验证码将在 <strong>${ttlMinutes}分钟</strong> 内失效，请及时使用以完成${purposeAction}。</p>
        <p>请妥善保管验证码，不要泄露给他人，确保账户安全。</p>
      </div>
      <p style="margin-top: 30px;">如果您并未请求此验证码，请忽略此邮件。</p>
    </div>
    <div class="email-footer">
      <p>&copy; 2025 Si-Me™ Engineer Agent. 感谢您的支持！</p>
      <p>如有任何疑问，请随时 <a href="#">联系我们</a> 或访问我们的 <a href="#">帮助中心</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateEmailCaptchaText(data: EmailCaptchaTemplateData): string {
  const { purposeText, purposeAction, code, ttlMinutes } = data;
  
  return `亲爱的用户，您好！

为了您的安全，我们为您生成了${purposeText}验证码：

验证码：${code}

此验证码将在 ${ttlMinutes} 分钟内失效，请及时使用以完成${purposeAction}。

请妥善保管验证码，不要泄露给他人，确保账户安全。

如果您并未请求此验证码，请忽略此邮件。

&copy; 2025 Si-Me™ Engineer Agent. 感谢您的支持！`;
}