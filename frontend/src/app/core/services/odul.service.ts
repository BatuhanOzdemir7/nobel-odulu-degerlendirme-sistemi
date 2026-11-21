import { Injectable } from '@angular/core';
import { Odul } from '../models/records';
import { ResourceHttpService } from './resource-http.service';
@Injectable({ providedIn: 'root' })
export class OdulService extends ResourceHttpService<Odul> { constructor() { super('oduller'); } }
