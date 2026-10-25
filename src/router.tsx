import {createBrowserRouter, Navigate, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {studioHref} from './shell/nav';
import {NotFound} from './shell/NotFound';
import {ActivityPage} from './tools/analytics/activity/ActivityPage';
import {CalibrationPage} from './tools/analytics/calibration/CalibrationPage';
import {CardAnalyticsPage} from './tools/analytics/cards/CardAnalyticsPage';
import {OverviewPage} from './tools/analytics/overview/OverviewPage';
import {WebAnalyticsPage} from './tools/analytics/web/WebAnalyticsPage';
import {ChangesPage} from './tools/changes/ChangesPage';
import {FeaturedPage} from './tools/featured/FeaturedPage';
import {StudioPage} from './tools/studio/StudioPage';

/** Admin's routes. Every one renders inside AdminShell, whose sidebar links them (src/shell/nav.ts). */
export const routes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      {index: true, element: <OverviewPage />},
      {path: 'activity', element: <ActivityPage />},
      {path: 'web', element: <WebAnalyticsPage />},
      {path: 'calibration', element: <CalibrationPage />},
      // One element for every card: bare /cards opens the last card viewed, or the "Pick a card" prompt.
      {path: 'cards/:cardId?', element: <CardAnalyticsPage />},
      // The old analytics page split into the insights pages; a bookmark lands on the Overview (R-10).
      {path: 'analytics', element: <Navigate to="/" replace />},
      // New reveal and Edit card (R4); ?mode= and ?card= pick the mode and the card (studioHref).
      {path: 'studio', element: <StudioPage />},
      // The homepage's six featured cards (#95): commits featuredCardIds.json, behind the token gate.
      {path: 'featured', element: <FeaturedPage />},
      // What changed in the app's card data and tuning, from its history; read-only, behind the token gate.
      {path: 'changes', element: <ChangesPage />},
      // Card studio replaced the two write tools at /reveal and /image (R4). Old links, from
      // bookmarks and the runbooks, land in the mode that replaced each (R-10).
      {path: 'reveal', element: <Navigate to={studioHref('new')} replace />},
      {path: 'image', element: <Navigate to={studioHref('edit')} replace />},
      // The tuning editor moved into /calibration's aside (R-10).
      {path: 'tuning', element: <Navigate to="/calibration" replace />},
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
