import { Injectable } from '@angular/core';
import { Degerlendirme } from '../models/records';
import { ResourceHttpService } from './resource-http.service';
@Injectable({ providedIn: 'root' })
export class DegerlendirmeService extends ResourceHttpService<Degerlendirme> { constructor() { super('degerlendirmeler'); } }
