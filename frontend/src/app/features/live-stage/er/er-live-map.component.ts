import { ChangeDetectionStrategy, Component, computed, input, isDevMode } from '@angular/core';
import type { ErHighlight } from '../../../core/events/activity-event.model';
import { ER_EDGES, ER_NODES } from './er-topology';

const nodeIds = new Set<string>(ER_NODES.map(node => node.id));
const edgeIds = new Set(ER_EDGES.map(edge => edge.id));

@Component({
  selector: 'app-er-live-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './er-live-map.component.html',
  styleUrl: './er-live-map.component.css',
})
export class ErLiveMapComponent {
  readonly highlight = input<ErHighlight | null>(null);
  readonly compact = input(false);

  protected readonly nodes = ER_NODES;
  protected readonly edges = ER_EDGES;
  protected readonly activeNodes = computed(() => this.known(this.highlight()?.nodes, nodeIds));
  protected readonly activeEdges = computed(() => {
    const explicit = this.known(this.highlight()?.edges, edgeIds);
    const nodes = this.activeNodes();
    return new Set(ER_EDGES.filter(edge => explicit.has(edge.id)
      || (nodes.has(edge.from) && nodes.has(edge.to))).map(edge => edge.id));
  });
  protected readonly error = computed(() => this.highlight()?.severity === 'error');
  protected readonly accessibleLabel = computed(() => {
    const labels = ER_NODES.filter(node => this.activeNodes().has(node.id)).map(node => node.label);
    return labels.length ? 'ER diyagramı. Etkin düğümler: ' + labels.join(', ') : 'Nobel veritabanı ER diyagramı';
  });

  private known(ids: readonly string[] | undefined, valid: ReadonlySet<string>): Set<string> {
    const known = new Set<string>();
    for (const id of ids ?? []) {
      if (valid.has(id)) known.add(id);
      else if (isDevMode()) console.warn('Bilinmeyen ER kimliği:', id);
    }
    return known;
  }
}
