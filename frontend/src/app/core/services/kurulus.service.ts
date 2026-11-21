import { Injectable } from '@angular/core';
import { Kurulus } from '../models/records';
import { ResourceHttpService } from './resource-http.service';
@Injectable({ providedIn: 'root' })
export class KurulusService extends ResourceHttpService<Kurulus> { constructor() { super('kuruluslar'); } }
