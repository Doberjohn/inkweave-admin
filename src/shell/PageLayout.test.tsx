import {render, screen, within} from '@testing-library/react';
import {PageLayout} from './PageLayout';

afterEach(() => vi.unstubAllEnvs());

describe('PageLayout', () => {
  it("puts the page's header and body in the main landmark", () => {
    render(
      <PageLayout
        title="Vote activity"
        subtitle="Who votes, and on what."
        meta="Data as of 2026-09-30"
        actions={<button type="button">Refresh</button>}>
        <p>Body</p>
      </PageLayout>,
    );
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', {level: 1, name: 'Vote activity'})).toBeInTheDocument();
    expect(main.getByText('Who votes, and on what.')).toBeInTheDocument();
    expect(main.getByText('Data as of 2026-09-30')).toBeInTheDocument();
    expect(main.getByRole('button', {name: 'Refresh'})).toBeInTheDocument();
    expect(main.getByText('Body')).toBeInTheDocument();
  });

  it('names the browser tab after the page, and renames it with the title', () => {
    const {rerender, unmount} = render(
      <PageLayout title="Vote activity">
        <p>Body</p>
      </PageLayout>,
    );
    expect(document.title).toBe('Vote activity · Inkweave admin');
    rerender(
      <PageLayout title="Web analytics">
        <p>Body</p>
      </PageLayout>,
    );
    expect(document.title).toBe('Web analytics · Inkweave admin');
    // Nothing to restore: the next page sets its own.
    unmount();
    expect(document.title).toBe('Web analytics · Inkweave admin');
  });

  it('names no branch on a page that writes nothing', () => {
    render(
      <PageLayout title="Web analytics">
        <p>Body</p>
      </PageLayout>,
    );
    expect(screen.queryByText('Writes to Doberjohn/inkweave')).not.toBeInTheDocument();
  });

  it('names the branch a page that writes commits to', () => {
    render(
      <PageLayout title="Card studio" writes>
        <p>Body</p>
      </PageLayout>,
    );
    expect(screen.getByText('Writes to Doberjohn/inkweave')).toHaveTextContent('Writes to Doberjohn/inkweave master');
  });

  it("takes the page's own label, and names a rehearsal branch", () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    render(
      <PageLayout title="Calibration & tuning" writes branchLabel="Tuning writes to">
        <p>Body</p>
      </PageLayout>,
    );
    expect(screen.getByText('Tuning writes to')).toHaveTextContent('Tuning writes to admin-verify');
  });
});
