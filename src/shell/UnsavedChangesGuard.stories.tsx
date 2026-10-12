import type {Meta, StoryObj} from '@storybook/react-vite';
import {UnsavedChangesDialog} from './UnsavedChangesGuard';
import {writeInFlightMessage} from './writeInFlight';

const meta: Meta<typeof UnsavedChangesDialog> = {
  title: 'Admin/UnsavedChangesDialog',
  component: UnsavedChangesDialog,
  args: {
    open: true,
    message: "2 pending tuning edits aren't published yet. Leaving this page drops them.",
    onStay: () => {},
    onLeave: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

/** What a page with unsaved edits asks when a link or the browser's Back would leave it (decision R-19). */
export const Open: Story = {};

/** Leaving while a commit is in flight, in the wording /calibration and the studio share (R-58). */
export const CommitInFlight: Story = {args: {message: writeInFlightMessage({action: 'save'})}};
