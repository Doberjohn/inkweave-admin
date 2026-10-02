import {createBrowserRouter, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {NotFound} from './shell/NotFound';
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
import {OverviewPage} from './tools/analytics/overview/OverviewPage';
import {ImagePage} from './tools/image/ImagePage';
import {RevealPage} from './tools/reveal/RevealPage';
import {TuningPage} from './tools/tuning/TuningPage';

/** Admin's routes. Every one renders inside AdminShell, whose sidebar links them (src/shell/nav.ts). */
export const routes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      {index: true, element: <OverviewPage />},
      {path: 'analytics', element: <AnalyticsPage />},
      {path: 'reveal', element: <RevealPage />},
      {path: 'image', element: <ImagePage />},
      {path: 'tuning', element: <TuningPage />},
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
