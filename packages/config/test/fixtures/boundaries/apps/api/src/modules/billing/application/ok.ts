import { post } from '../../accounting/public/index.ts';
import { coreApi } from '../../core/public/index.ts';
import { own } from '../domain/own.ts';
export const ok = [post, coreApi, own];
