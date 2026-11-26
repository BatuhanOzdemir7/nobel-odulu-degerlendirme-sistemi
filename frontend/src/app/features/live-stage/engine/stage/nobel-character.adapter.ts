import { ApplicationRef, createComponent, type ComponentRef, type EnvironmentInjector } from '@angular/core';
import type { PortfolioStageAdapter, StageCharacterCommand } from '../../stage/stage.contract';
import { NobelStageComponent } from './nobel-stage.component';

/** PortfolioStageAdapter'ın Nobel uygulaması: Angular bileşenini dinamik olarak kapsayıcıya bağlar. */
export class NobelCharacterAdapter implements PortfolioStageAdapter {
  private ref: ComponentRef<NobelStageComponent> | null = null;
  private host: HTMLElement | null = null;

  constructor(private readonly injector: EnvironmentInjector) {}

  mount(container: HTMLElement): void {
    if (this.ref) return;
    const host = container.ownerDocument.createElement('div');
    host.style.cssText = 'display:block;position:relative;width:100%;height:100%;';
    container.replaceChildren(host);
    this.host = host;
    this.ref = createComponent(NobelStageComponent, { environmentInjector: this.injector, hostElement: host });
    this.injector.get(ApplicationRef).attachView(this.ref.hostView); // signal/OnPush güncellemeleri için şart
  }

  play(command: StageCharacterCommand): void {
    this.ref?.instance.play(command);
  }

  destroy(): void {
    if (!this.ref) return;
    this.injector.get(ApplicationRef).detachView(this.ref.hostView);
    this.ref.destroy();
    this.ref = null;
    this.host?.remove();
    this.host = null;
  }
}
