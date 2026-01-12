export function getMimeTypeByExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return 'text/markdown; charset=utf-8';
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
      return 'text/plain; charset=utf-8';
    case 'png':
    case 'jpeg':
    case 'jpg':
      return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    default:
      return 'application/octet-stream';
  }
}
