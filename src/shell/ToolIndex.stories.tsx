import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {ToolIndex} from './ToolIndex';

const meta: Meta<typeof ToolIndex> = {
  title: 'Admin/ToolIndex',
  component: ToolIndex,
  // The Open buttons navigate, so the story needs a router.
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof ToolIndex> = {};
