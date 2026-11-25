import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PrivacySetting } from '../models/portal.models';
import { API_BASE_URL } from './api-url';

@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private readonly http = inject(HttpClient);
  private readonly url = API_BASE_URL + '/admin/ayarlar/gizlilik-modu';

  privacyMode() { return this.http.get<PrivacySetting>(this.url); }
  setPrivacyMode(setting: PrivacySetting) { return this.http.put<PrivacySetting>(this.url, setting); }
}
