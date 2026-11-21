import { Component } from '@angular/core';
import { KayitlarComponent } from './features/kayitlar/kayitlar.component';
import { AdaylarComponent } from './features/adaylar/adaylar.component';
import { UzmanlarKomitelerComponent } from './features/uzmanlar-komiteler/uzmanlar-komiteler.component';
import { AdayGostermeComponent } from './features/aday-gosterme/aday-gosterme.component';
import { DegerlendirmelerComponent } from './features/degerlendirmeler/degerlendirmeler.component';

type View = 'kayitlar' | 'adaylar' | 'komiteler' | 'gosterme' | 'degerlendirme';

@Component({
  selector: 'nobel-root',
  standalone: true,
  imports: [KayitlarComponent, AdaylarComponent, UzmanlarKomitelerComponent, AdayGostermeComponent, DegerlendirmelerComponent],
  template: `
    <header class="topbar">
      <a class="brand" href="/">Nobel <span>Değerlendirme Sistemi</span></a>
      <nav aria-label="Ana menü">
        <button [class.active]="view === 'kayitlar'" (click)="view = 'kayitlar'">Kategoriler &amp; Ödüller</button>
        <button [class.active]="view === 'adaylar'" (click)="view = 'adaylar'">Adaylar &amp; Kuruluşlar</button>
        <button [class.active]="view === 'komiteler'" (click)="view = 'komiteler'">Uzmanlar &amp; Komiteler</button>
        <button [class.active]="view === 'gosterme'" (click)="view = 'gosterme'">Aday Gösterme</button>
        <button [class.active]="view === 'degerlendirme'" (click)="view = 'degerlendirme'">Değerlendirmeler</button>
      </nav>
    </header>
    <main>
      @switch (view) {
        @case ('kayitlar') { <nobel-kayitlar /> }
        @case ('adaylar') { <nobel-adaylar /> }
        @case ('komiteler') { <nobel-uzmanlar-komiteler /> }
        @case ('gosterme') { <nobel-aday-gosterme /> }
        @case ('degerlendirme') { <nobel-degerlendirmeler /> }
      }
    </main>
  `
})
export class AppComponent { view: View = 'kayitlar'; }
