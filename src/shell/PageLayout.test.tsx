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

  it('names the tab after documentTitle when the page gives one, and after its title again without (R-51)', () => {
    const {rerender} = render(
      <PageLayout title="Card analytics" documentTitle="Elsa - Snow Queen · Card analytics">
        <p>Body</p>
      </PageLayout>,
    );
    expect(document.title).toBe('Elsa - Snow Queen · Card analytics · Inkweave admin');
    // The h1 keeps the page's own title.
    expect(screen.getByRole('heading', {level: 1, name: 'Card analytics'})).toBeInTheDocument();
    rerender(
      <PageLayout title="Card analytics">
        <p>Body</p>
      </PageLayout>,
    );
    expect(document.title).toBe('Card analytics · Inkweave admin');
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

  it('puts a flush page straight into the scrolling body, with no padding and no grid', () => {
    render(
      <PageLayout title="Calibration & tuning" flush>
        <p>Body</p>
      </PageLayout>,
    );
    const body = screen.getByText('Body').parentElement;
    expect(body).toHaveStyle({overflowY: 'auto'});
    expect(body).not.toHaveStyle({display: 'grid'});
    expect(body?.style.padding).toBe('');
  });

  it('scrolls the body back to the top when scrollKey changes, and not while it stays the same', () => {
    const {rerender} = render(
      <PageLayout title="Card analytics" scrollKey="2983">
        <p>Elsa</p>
      </PageLayout>,
    );
    const body = screen.getByRole('main').lastElementChild as HTMLElement;
    body.scrollTop = 500;
    rerender(
      <PageLayout title="Card analytics" scrollKey="2983">
        <p>Elsa, updated</p>
      </PageLayout>,
    );
    expect(body.scrollTop).toBe(500);
    rerender(
      <PageLayout title="Card analytics" scrollKey="2984">
        <p>Anna</p>
      </PageLayout>,
    );
    // The same scroller, kept mounted, back at the top.
    expect(screen.getByText('Anna').parentElement).toBe(body);
    expect(body.scrollTop).toBe(0);
  });

  it('lays the body out as the padded grid without flush', () => {
    render(
      <PageLayout title="Vote activity">
        <p>Body</p>
      </PageLayout>,
    );
    const body = screen.getByText('Body').parentElement;
    expect(body).toHaveStyle({overflowY: 'auto', display: 'grid'});
    expect(body?.style.padding).not.toBe('');
  });
});
