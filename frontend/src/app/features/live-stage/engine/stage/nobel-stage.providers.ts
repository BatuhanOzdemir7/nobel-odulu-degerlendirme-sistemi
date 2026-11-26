import { EnvironmentInjector, inject, type Provider } from '@angular/core';
import { STAGE_ADAPTER_FACTORY, type PortfolioStageAdapter } from '../../stage/stage.contract';
import { NobelCharacterAdapter } from './nobel-character.adapter';

export function provideNobelCharacterStage(): Provider {
  return {
    provide: STAGE_ADAPTER_FACTORY,
    useFactory: () => {
      const injector = inject(EnvironmentInjector);
      return (): PortfolioStageAdapter => new NobelCharacterAdapter(injector);
    },
  };
}
