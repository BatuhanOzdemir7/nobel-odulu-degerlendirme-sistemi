import { HttpContextToken } from '@angular/common/http';

export const API_BASE_URL = 'http://localhost:8080/api';
export const SHOW_FORBIDDEN_IN_VIEW = new HttpContextToken(() => false);
