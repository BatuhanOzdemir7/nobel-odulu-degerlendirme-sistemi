import { Injectable } from '@angular/core';
import { Kategori } from '../models/records';
import { ResourceHttpService } from './resource-http.service';
@Injectable({ providedIn: 'root' })
export class KategoriService extends ResourceHttpService<Kategori> { constructor() { super('kategoriler'); } }
