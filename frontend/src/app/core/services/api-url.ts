import { HttpContextToken } from '@angular/common/http';
import { SAME_ORIGIN_API } from './api-mode';

export const API_BASE_URL = SAME_ORIGIN_API ? `${location.origin}/api` : 'http://localhost:8080/api';
export const SHOW_FORBIDDEN_IN_VIEW = new HttpContextToken(() => false);
