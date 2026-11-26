import type { PortfolioStageAdapter, StageCharacterCommand } from './stage.contract';

export class NoopStageAdapter implements PortfolioStageAdapter {
  private list?: HTMLOListElement;

  mount(container: HTMLElement): void {
    const note = container.ownerDocument.createElement('p');
    note.textContent = "Karakter sahnesi Faz 3B'de bağlanacak";
    const list = container.ownerDocument.createElement('ol');
    list.setAttribute('aria-label', 'Son sahne komutları');
    container.replaceChildren(note, list);
    this.list = list;
  }

  play(command: StageCharacterCommand): void {
    if (!this.list) return;
    const row = this.list.ownerDocument.createElement('li');
    row.textContent = [command.scene, this.description(command)].join(' · ');
    this.list.append(row);
    if (this.list.childElementCount > 5) this.list.firstElementChild?.remove();
  }

  destroy(): void {
    this.list?.parentElement?.replaceChildren();
    this.list = undefined;
  }

  private description(command: StageCharacterCommand): string {
    switch (command.scene) {
      case 'NOMINATION': return [command.organizationLabel, command.candidateName].join(' → ');
      case 'COMMITTEE_VOTE': return [command.expertLabel, command.candidateName, command.vote].join(' · ');
      case 'DECISION_FINALIZED': return [command.committeeLabel, command.candidateName, command.result].join(' · ');
      case 'CONSTRAINT_ERROR': return command.message;
    }
  }
}
