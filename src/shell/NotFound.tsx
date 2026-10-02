import {Link} from 'react-router-dom';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {PageLayout} from './PageLayout';

/** Any path that isn't an admin page. */
export function NotFound() {
  return (
    <PageLayout title="Not found">
      <p style={{margin: 0, fontSize: ADMIN_TYPE.emphasis, color: ADMIN_COLORS.muted}}>
        No admin page lives at this address.{' '}
        <Link to="/" style={{color: ADMIN_COLORS.accent}}>
          Back to Overview
        </Link>
      </p>
    </PageLayout>
  );
}
