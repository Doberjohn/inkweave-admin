import type {Meta, StoryObj} from '@storybook/react-vite';
import {TUNING} from 'inkweave-synergy-engine';
import {TuningEditor} from './TuningEditor';

const meta: Meta<typeof TuningEditor> = {
  title: 'TuningAdmin/TuningEditor',
  component: TuningEditor,
  // The bundled copy stands in for the live tuning.json the page reads.
  args: {token: 'ghp_example', config: TUNING},
  decorators: [
    (Story) => (
      <div style={{maxWidth: 1000, padding: 16}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof TuningEditor> = {};
