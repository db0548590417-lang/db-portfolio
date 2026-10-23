import { AsyncLocalStorage } from 'node:async_hooks';
import { GoogleGenAI } from '@google/genai';

export const requestScope = new AsyncLocalStorage<any>();
export const getRuntimeEnv = () => requestScope.getStore()?.values || {};
export const ai = { models: { generateContent(args: any) {
  const scope = requestScope.getStore();
  if (!scope?.values.GEMINI_API_KEY) throw new Error('יש להגדיר מפתח Gemini בהגדרות האתר');
  const client = new GoogleGenAI({ apiKey: scope.values.GEMINI_API_KEY });
  return client.models.generateContent({ ...args,
    model: args.model === 'gemini-3.8-flash' ? scope.values.INSPIRA_VISION_MODEL : args.model });
} } };

const storageKey = (file: string) => {
  const scope = requestScope.getStore();
  if (!scope?.userId || !scope.bucket) throw new Error('אחסון האתר אינו זמין');
  return `users/${encodeURIComponent(scope.userId)}/files/${file.replaceAll('\\', '/')}`;
};
export const visionFs = {
  async readFile(file: string, _encoding?: string) {
    const value = await requestScope.getStore().bucket.get(storageKey(file));
    if (!value) throw new Error('File not found');
    return value.text();
  },
  async mkdir(..._args: any[]) {},
  async writeFile(file: string, content: string, _encoding?: string) {
    await requestScope.getStore().bucket.put(storageKey(file), content);
  },
  async rename(from: string, to: string) {
    const bucket = requestScope.getStore().bucket;
    const value = await bucket.get(storageKey(from));
    if (!value) throw new Error('File not found');
    await bucket.put(storageKey(to), value.body);
    await bucket.delete(storageKey(from));
  },
};
