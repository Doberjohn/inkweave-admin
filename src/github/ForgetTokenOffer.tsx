import {LinkButton} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';

/**
 * The way out when GitHub rejects the saved token (a 401, isRejectedToken):
 * "Forget token", so the token gate asks for a new one (R-26). The caller
 * decides when to offer it and what forgetting does: the tuning aside asks
 * first when edits are pending. The button sits inside a sentence, so the
 * 24px target rule's inline exception applies (WCAG 2.5.8).
 */
export function ForgetTokenOffer({onForget}: {onForget: () => void}) {
  return (
    <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
      GitHub rejected the saved token.{' '}
      <LinkButton type="button" onClick={onForget} style={{fontSize: ADMIN_TYPE.small}}>
        Forget token
      </LinkButton>{' '}
      to enter a new one.
    </p>
  );
}
