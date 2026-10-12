import type {SynergyGroup} from 'inkweave-synergy-engine';
import {Panel} from '../../../ui/Panel';
import {SynergyPreviewPanel} from '../../reveal/components/SynergyPreviewPanel';

/**
 * The aside's last panel (R-90): the engine's synergy groups for the card on
 * screen, computed live from the form as it changes, not read from the
 * deployed synergy files. The page leaves it out for an image-only card (R-61).
 */
export function SynergyPanel({groups}: {groups: SynergyGroup[]}) {
  return (
    <Panel title="Synergies" action="computed live">
      <SynergyPreviewPanel groups={groups} />
    </Panel>
  );
}
