import { Injectable } from '@angular/core';
import { AdayGosterme } from '../models/records';
import { ResourceHttpService } from './resource-http.service';
@Injectable({ providedIn: 'root' })
export class AdayGostermeService extends ResourceHttpService<AdayGosterme> { constructor() { super('aday-gostermeler'); } }
