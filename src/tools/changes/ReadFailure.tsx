import {LinkButton, Notice, SPACING} from '../../app-bridge';
import {ForgetTokenOffer} from '../../github/ForgetTokenOffer';
import {isRejectedToken} from '../../github/rejectedToken';

interface ReadFailureProps {
  /** What couldn't be read, as the sentence opens: "The app’s history", "What this change did". */
  what: string;
  error: string;
  onRetry: () => void;
  /** Forgets the saved token, which GitHub rejected. */
  onForgetToken: () => void;
}

/**
 * A read of the app repo that failed: what couldn't be read and why, Try again, and Forget
 * token when GitHub rejected the saved one (a 401), since a page that only reads shows no
 * token box in the sidebar.
 */
export function ReadFailure({what, error, onRetry, onForgetToken}: ReadFailureProps) {
  return (
    <div style={{display: 'grid', gap: SPACING.md}}>
      <Notice tone="error">
        {what} could not be read: {error}{' '}
        <LinkButton type="button" size="sm" onClick={onRetry}>
          Try again
        </LinkButton>
      </Notice>
      {isRejectedToken(error) && <ForgetTokenOffer onForget={onForgetToken} />}
    </div>
  );
}
