import { Injectable } from '@angular/core';
import { Uzman } from '../models/records';
import { ResourceHttpService } from './resource-http.service';
@Injectable({ providedIn: 'root' })
export class UzmanService extends ResourceHttpService<Uzman> { constructor() { super('uzmanlar'); } }
