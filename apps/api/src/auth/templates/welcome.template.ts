import { MailTemplate } from '@lib/mail';

export const welcomeTemplate: MailTemplate = {
  name: 'welcome',
  subject: '欢迎注册 AI Chatbot',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>欢迎注册</title>
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
          background: #007bff;
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
          background: #28a745;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>欢迎加入 AI Chatbot</h1>
        </div>
        <div class="content">
          <p>亲爱的 {{name}}，</p>
          <p>感谢您注册 AI Chatbot！您的账户已经创建成功。</p>
          <p>您可以点击下面的按钮开始使用：</p>
          <p>
            <a href="{{loginUrl}}" class="button">立即登录</a>
          </p>
          <p>如果您有任何问题，请联系我们的客服。</p>
          <p>祝好！<br>AI Chatbot 团队</p>
        </div>
      </div>
    </body>
    </html>
  `,
};
