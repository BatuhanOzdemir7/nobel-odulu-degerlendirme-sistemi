import { Injectable } from '@angular/core';
import { Aday } from '../models/records';
import { ResourceHttpService } from './resource-http.service';
@Injectable({ providedIn: 'root' })
export class AdayService extends ResourceHttpService<Aday> { constructor() { super('adaylar'); } }
