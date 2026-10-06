import type {Meta, StoryObj} from '@storybook/react-vite';
import {ForgetTokenOffer} from './ForgetTokenOffer';

const meta: Meta<typeof ForgetTokenOffer> = {
  title: 'Admin/ForgetTokenOffer',
  component: ForgetTokenOffer,
  args: {onForget: () => {}},
};
export default meta;
type Story = StoryObj<typeof ForgetTokenOffer>;

export const Default: Story = {};
