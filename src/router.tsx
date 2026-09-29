import {createBrowserRouter, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {NotFound} from './shell/NotFound';
import {ToolIndex} from './shell/ToolIndex';

/** Admin's routes (docs/PLAN.md, D10). Every one renders inside AdminShell. */
export const routes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      {index: true, element: <ToolIndex />},
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
