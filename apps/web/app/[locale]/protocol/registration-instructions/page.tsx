import fs from 'fs';
import { notFound } from 'next/navigation';
import path from 'path';

interface ProtocolPageProps {
  params: {
    locale: string;
  };
}

export default async function RegistrationInstructionsPage({ params }: ProtocolPageProps) {
  // locale参数暂时未使用，但保留以备将来国际化需要
  void params.locale;

  try {
    const filePath = path.join(process.cwd(), 'public', 'protocol', 'YS Framework-注销须知.md');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // 简单的Markdown解析，将标题转换为HTML
    const htmlContent = fileContent
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-6">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-4 mt-8">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mb-3 mt-6">$1</h3>')
      .replace(/^\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-2">$1</li>')
      .replace(/\n\n/gim, '</p><p className="mb-4">')
      .replace(/^/, '<p className="mb-4">')
      .replace(/$/, '</p>');

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
