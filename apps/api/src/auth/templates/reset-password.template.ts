import { MailTemplate } from '@lib/mail';

export const resetPasswordTemplate: MailTemplate = {
  name: 'reset-password',
  subject: '重置密码 - AI Chatbot',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>重置密码</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: #dc3545;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background: #f8f9fa;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background: #dc3545;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 10px;
          border-radius: 5px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>重置密码</h1>
        </div>
        <div class="content">
          <p>亲爱的 {{name}}，</p>
          <p>我们收到了您的密码重置请求。</p>
          <p>请点击下面的按钮重置密码：</p>
          <p>
            <a href="{{resetUrl}}" class="button">重置密码</a>
          </p>
          <div class="warning">
            <p><strong>安全提示：</strong></p>
            <p>此链接将在 {{expiryHours}} 小时后失效。</p>
            <p>如果您没有请求重置密码，请忽略此邮件。</p>
          </div>
          <p>如果您有任何问题，请联系我们的客服。</p>
          <p>祝好！<br>AI Chatbot 团队</p>
        </div>
      </div>
    </body>
    </html>
  `,
};
