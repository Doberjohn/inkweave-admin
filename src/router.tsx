import {createBrowserRouter, Navigate, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {NotFound} from './shell/NotFound';
import {ActivityPage} from './tools/analytics/activity/ActivityPage';
import {CalibrationPage} from './tools/analytics/calibration/CalibrationPage';
import {OverviewPage} from './tools/analytics/overview/OverviewPage';
import {WebAnalyticsPage} from './tools/analytics/web/WebAnalyticsPage';
import {ImagePage} from './tools/image/ImagePage';
import {RevealPage} from './tools/reveal/RevealPage';

/** Admin's routes. Every one renders inside AdminShell, whose sidebar links them (src/shell/nav.ts). */
export const routes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      {index: true, element: <OverviewPage />},
      {path: 'activity', element: <ActivityPage />},
      {path: 'web', element: <WebAnalyticsPage />},
      {path: 'calibration', element: <CalibrationPage />},
      // The old analytics page split into the insights pages; a bookmark lands on the Overview (R-10).
      {path: 'analytics', element: <Navigate to="/" replace />},
      {path: 'reveal', element: <RevealPage />},
      {path: 'image', element: <ImagePage />},
      // The tuning editor moved into /calibration's aside (R-10).
      {path: 'tuning', element: <Navigate to="/calibration" replace />},
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
