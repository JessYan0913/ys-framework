'use client';

import {
  AlertCircle,
  CheckCircle,
  Download,
  FileIcon,
  FolderOpen,
  Link,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useRef, useState } from 'react';

import { toast } from '@/components/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatFileSize } from '@/lib/utils';
import { useI18n } from '@/locales/client';

interface UploadedFile {
  fileKey: string;
  filename: string;
  size: number;
  contentType?: string;
  url?: string;
  uploadedAt: Date;
}

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  fileKey?: string;
}

interface ChunkUploadSession {
  uploadId: string;
  fileKey: string;
  chunkSize: number;
  totalChunks: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export default function FilesPage() {
  const t = useI18n();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if ((session as any)?.accessToken) {
      headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
    }
    return headers;
  }, [session]);

  // Simple upload for small files
  const simpleUpload = useCallback(
    async (file: File): Promise<{ fileKey: string; url: string }> => {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if ((session as any)?.accessToken) {
        headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/files/upload/simple`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    [session],
  );

  // Chunked upload for large files
  const chunkedUpload = useCallback(
    async (file: File, onProgress: (progress: number) => void): Promise<{ fileKey: string; url: string }> => {
      // Step 1: Initiate upload
      const initResponse = await fetch(`${API_BASE_URL}/files/upload/initiate`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          contentType: file.type,
          chunkSize: CHUNK_SIZE,
        }),
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initiate upload');
      }

      const uploadSession: ChunkUploadSession = await initResponse.json();

      // Step 2: Upload chunks
      const totalChunks = uploadSession.totalChunks;
      for (let i = 0; i < totalChunks; i++) {
        const start = i * uploadSession.chunkSize;
        const end = Math.min(start + uploadSession.chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('uploadId', uploadSession.uploadId);
        formData.append('fileKey', uploadSession.fileKey);
        formData.append('partNumber', String(i + 1));
        formData.append('file', chunk);

        const chunkHeaders: Record<string, string> = {};
        if ((session as any)?.accessToken) {
          chunkHeaders['Authorization'] = `Bearer ${(session as any).accessToken}`;
        }

        const chunkResponse = await fetch(`${API_BASE_URL}/files/upload/chunk`, {
          method: 'POST',
          headers: chunkHeaders,
          body: formData,
        });

        if (!chunkResponse.ok) {
          // Abort upload on failure
          await fetch(`${API_BASE_URL}/files/upload/abort`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              uploadId: uploadSession.uploadId,
              fileKey: uploadSession.fileKey,
            }),
          });
          throw new Error(`Failed to upload chunk ${i + 1}`);
        }

        onProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // Step 3: Complete upload
      const completeResponse = await fetch(`${API_BASE_URL}/files/upload/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          uploadId: uploadSession.uploadId,
          fileKey: uploadSession.fileKey,
        }),
      });

      if (!completeResponse.ok) {
        throw new Error('Failed to complete upload');
      }

      return completeResponse.json();
    },
    [getAuthHeaders, session],
  );

  const handleFileUpload = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      setIsUploading(true);
      const newProgress: UploadProgress[] = Array.from(selectedFiles).map((file) => ({
        filename: file.name,
        progress: 0,
        status: 'pending' as const,
      }));
      setUploadProgress(newProgress);

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const useChunkedUpload = file.size > CHUNK_SIZE;

        setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: 'uploading' } : p)));

        try {
          let result: { fileKey: string; url: string };

          if (useChunkedUpload) {
            result = await chunkedUpload(file, (progress) => {
              setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, progress } : p)));
            });
          } else {
            result = await simpleUpload(file);
            setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, progress: 100 } : p)));
          }

          setUploadProgress((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, status: 'completed', fileKey: result.fileKey } : p)),
          );

          setFiles((prev) => [
            ...prev,
            {
              fileKey: result.fileKey,
              filename: file.name,
              size: file.size,
              contentType: file.type,
              url: result.url,
              uploadedAt: new Date(),
            },
          ]);

          toast({ type: 'success', description: t('files.upload.success', { filename: file.name }) });
        } catch (error) {
          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i
                ? { ...p, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
                : p,
            ),
          );
          toast({ type: 'error', description: t('files.upload.error', { filename: file.name }) });
        }
      }

      setIsUploading(false);
    },
    [chunkedUpload, simpleUpload, t],
  );

  const handleGetFileUrl = async (fileKey: string) => {
    try {
      const headers: Record<string, string> = {};
      if ((session as any)?.accessToken) {
        headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/files/${fileKey}/url`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to get file URL');
      }

      const { url } = await response.json();
      await navigator.clipboard.writeText(url);
      toast({ type: 'success', description: t('files.actions.urlCopied') });
    } catch {
      toast({ type: 'error', description: t('files.actions.urlError') });
    }
  };

  const handleDownloadFile = async (fileKey: string, filename: string) => {
    try {
      const headers: Record<string, string> = {};
      if ((session as any)?.accessToken) {
        headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/files/${fileKey}/download`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ type: 'success', description: t('files.actions.downloadSuccess') });
    } catch {
      toast({ type: 'error', description: t('files.actions.downloadError') });
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      const headers: Record<string, string> = {};
      if ((session as any)?.accessToken) {
        headers['Authorization'] = `Bearer ${(session as any).accessToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/files/${fileToDelete.fileKey}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setFiles((prev) => prev.filter((f) => f.fileKey !== fileToDelete.fileKey));
      toast({ type: 'success', description: t('files.actions.deleteSuccess') });
    } catch {
      toast({ type: 'error', description: t('files.actions.deleteError') });
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload],
  );

  const clearUploadProgress = () => {
    setUploadProgress([]);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('files.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('files.description')}</p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">{t('files.tabs.upload')}</TabsTrigger>
          <TabsTrigger value="list">{t('files.tabs.list')}</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>{t('files.upload.title')}</CardTitle>
              <CardDescription>{t('files.upload.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <Upload className="mx-auto size-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t('files.upload.dragDrop')}</p>
                <p className="text-sm text-muted-foreground mt-2">{t('files.upload.or')}</p>
                <Button variant="outline" className="mt-4" disabled={isUploading}>
                  {t('files.upload.selectFiles')}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">{t('files.upload.chunkInfo', { size: '5MB' })}</p>
              </div>
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('files.upload.progress')}</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearUploadProgress}>
                  <X className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadProgress.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileIcon className="size-4" />
                        <span className="text-sm font-medium truncate max-w-[200px]">{item.filename}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status === 'uploading' && <Loader2 className="size-4 animate-spin text-primary" />}
                        {item.status === 'completed' && <CheckCircle className="size-4 text-green-500" />}
                        {item.status === 'error' && <AlertCircle className="size-4 text-destructive" />}
                        <span className="text-sm text-muted-foreground">{item.progress}%</span>
                      </div>
                    </div>
                    <Progress value={item.progress} className="h-2" />
                    {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('files.list.title')}</CardTitle>
                <CardDescription>{t('files.list.count', { count: files.length })}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => {}}>
                <RefreshCw className="size-4 mr-2" />
                {t('files.list.refresh')}
              </Button>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">{t('files.list.empty')}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t('files.list.emptyDescription')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('files.list.columns.name')}</TableHead>
                      <TableHead>{t('files.list.columns.size')}</TableHead>
                      <TableHead>{t('files.list.columns.type')}</TableHead>
                      <TableHead>{t('files.list.columns.uploadedAt')}</TableHead>
                      <TableHead className="text-right">{t('files.list.columns.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.fileKey}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileIcon className="size-4" />
                            <span className="truncate max-w-[200px]">{file.filename}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(file.size)}</TableCell>
                        <TableCell>{file.contentType || '-'}</TableCell>
                        <TableCell>{file.uploadedAt.toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleGetFileUrl(file.fileKey)}
                              title={t('files.actions.copyUrl')}
                            >
                              <Link className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadFile(file.fileKey, file.filename)}
                              title={t('files.actions.download')}
                            >
                              <Download className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setFileToDelete(file);
                                setDeleteDialogOpen(true);
                              }}
                              title={t('files.actions.delete')}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('files.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('files.delete.description', { filename: fileToDelete?.filename })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('files.delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile}>{t('files.delete.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
