'use client';
import { useCallback, useState } from 'react';

export interface AttachedFile {
  id: string;
  file: File;
  preview?: string;
  base64?: string;
  uploading: boolean;
  error?: string;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
]);

type UploadResult = { storageKey: string; base64?: string };

function readPreview(file: File, id: string, setFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>) {
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    setFiles((prev) =>
      prev.map((af) => (af.id === id ? { ...af, preview: e.target?.result as string } : af)),
    );
  };
  reader.readAsDataURL(file);
}

async function uploadFile(file: File, id: string, setFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>) {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch('/api/v1/ai/attachments', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('upload failed');
    const data = (await res.json()) as UploadResult;
    setFiles((prev) =>
      prev.map((af) => (af.id === id ? { ...af, uploading: false, base64: data.base64 } : af)),
    );
  } catch {
    setFiles((prev) =>
      prev.map((af) => (af.id === id ? { ...af, uploading: false, error: '업로드 실패' } : af)),
    );
  }
}

export function useFileAttach() {
  const [files, setFiles] = useState<AttachedFile[]>([]);

  const attach = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const valid = arr.filter((f) => f.size <= MAX_SIZE && ALLOWED.has(f.type));
    valid.forEach((file) => {
      const id = `${Date.now()}-${file.name}`;
      const newFile: AttachedFile = { id, file, uploading: true };
      setFiles((prev) => [...prev, newFile]);
      readPreview(file, id, setFiles);
      void uploadFile(file, id, setFiles);
    });
  }, []);

  const remove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clear = useCallback(() => setFiles([]), []);

  return { files, attach, remove, clear };
}
