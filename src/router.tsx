import {createBrowserRouter, Navigate, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {NotFound} from './shell/NotFound';
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
import {ImagePage} from './tools/image/ImagePage';
import {RevealPage} from './tools/reveal/RevealPage';
import {TuningPage} from './tools/tuning/TuningPage';

/** Admin's routes. Every one renders inside AdminShell, whose sidebar links them (src/shell/nav.ts). */
export const routes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      // Until the Overview takes / (R1).
      {index: true, element: <Navigate to="/analytics" replace />},
      {path: 'analytics', element: <AnalyticsPage />},
      {path: 'reveal', element: <RevealPage />},
      {path: 'image', element: <ImagePage />},
      {path: 'tuning', element: <TuningPage />},
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
