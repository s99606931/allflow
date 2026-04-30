import { randomUUID } from 'node:crypto';
import { ValidationError } from '@all-flow/shared/errors';
import type { FastifyInstance } from 'fastify';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
]);

export async function aiAttachmentRoutes(app: FastifyInstance): Promise<void> {
  app.post('/ai/attachments', { preHandler: [app.authenticate] }, async (req, reply) => {
    const data = await req.file({ limits: { fileSize: MAX_FILE_SIZE } });
    if (!data) throw new ValidationError('파일이 없습니다', []);
    if (!ALLOWED_MIME.has(data.mimetype)) {
      throw new ValidationError('허용되지 않는 파일 형식입니다', []);
    }
    const buf = await data.toBuffer();
    const storageKey = `attach/${randomUUID()}/${data.filename}`;
    const base64 = buf.toString('base64');
    return reply.code(201).send({
      storageKey,
      filename: data.filename,
      mimeType: data.mimetype,
      sizeBytes: buf.byteLength,
      base64,
    });
  });
}
