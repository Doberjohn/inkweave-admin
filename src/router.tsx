import {createBrowserRouter, Navigate, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {NotFound} from './shell/NotFound';
import {WriteToolFrame} from './shell/WriteToolFrame';
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
import {ImagePage} from './tools/image/ImagePage';
import {RevealPage} from './tools/reveal/RevealPage';
import {TuningPage} from './tools/tuning/TuningPage';

/**
 * Admin's routes. Every one renders inside AdminShell, whose sidebar links them
 * (src/shell/nav.ts). The write tools keep their own pages for now, framed with
 * the branch notice; the redesign rebuilds them in R2 (tuning) and R4 (reveal,
 * image).
 */
export const routes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      // Until the Overview takes / (R1).
      {index: true, element: <Navigate to="/analytics" replace />},
      {path: 'analytics', element: <AnalyticsPage />},
      {
        path: 'reveal',
        element: (
          <WriteToolFrame>
            <RevealPage />
          </WriteToolFrame>
        ),
      },
      {
        path: 'image',
        element: (
          <WriteToolFrame>
            <ImagePage />
          </WriteToolFrame>
        ),
      },
      {
        path: 'tuning',
        element: (
          <WriteToolFrame>
            <TuningPage />
          </WriteToolFrame>
        ),
      },
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
