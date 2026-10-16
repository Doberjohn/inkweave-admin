import type {DragEvent} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {act, createEvent, fireEvent, render, renderHook, screen} from '@testing-library/react';
import {useFileDrop, useFileDropGuard} from './useFileDrop';

/**
 * What a drag carries. jsdom has no DataTransfer, so fireEvent hands the
 * handlers this object as the event's dataTransfer: its types (all a drag
 * shows until the drop), its files (readable on the drop) and its dropEffect,
 * 'copy' to start with, as a browser starts a file dragged in from the desktop.
 */
function carrying(types: string[], files: File[] = []) {
  return {types, files, dropEffect: 'copy'};
}
const withFiles = (...files: File[]) => carrying(['Files'], files);
const scan = (name: string) => new File(['x'], name, {type: 'image/png'});

/** A control as the card panel draws one: a label round a child and its file input, which takes a dropped file. */
function Target({onFile}: {onFile: (file: File) => void}) {
  const {dragging, dropProps} = useFileDrop(onFile);
  return (
    <label data-dragging={dragging || undefined} {...dropProps}>
      <span>Click or drop to upload scan</span>
      <input type="file" />
    </label>
  );
}

function renderTarget(onFile = vi.fn()) {
  render(<Target onFile={onFile} />);
  const child = screen.getByText('Click or drop to upload scan');
  return {onFile, child, label: child.closest('label') as HTMLLabelElement};
}

const dragging = (label: HTMLElement) => label.dataset.dragging === 'true';

describe('useFileDrop', () => {
  it('hands the first file of a drop over, and lets the drop happen with a copy cursor', () => {
    const {onFile, label} = renderTarget();
    // From 'none', so the copy cursor is the handler's own.
    const data = {...withFiles(scan('mei.png'), scan('ming.png')), dropEffect: 'none'};
    // fireEvent answers false once a handler cancels the event: the browser lets the drop land here.
    expect(fireEvent.dragOver(label, {dataTransfer: data})).toBe(false);
    expect(data.dropEffect).toBe('copy');
    expect(fireEvent.drop(label, {dataTransfer: data})).toBe(false);
    expect(onFile).toHaveBeenCalledExactlyOnceWith(data.files[0]);
  });

  it.each([
    {what: 'text', data: carrying(['text/plain'])},
    {what: 'a link', data: carrying(['text/uri-list', 'text/plain'])},
  ])('leaves a drag of $what to the browser: no target, no drop', ({data}) => {
    const {onFile, label} = renderTarget();
    fireEvent.dragEnter(label, {dataTransfer: data});
    expect(dragging(label)).toBe(false);
    expect(fireEvent.dragOver(label, {dataTransfer: data})).toBe(true);
    expect(fireEvent.drop(label, {dataTransfer: data})).toBe(true);
    expect(onFile).not.toHaveBeenCalled();
  });

  it('takes nothing from a drop of files the browser holds back', () => {
    const {onFile, label} = renderTarget();
    fireEvent.drop(label, {dataTransfer: withFiles()});
    expect(onFile).not.toHaveBeenCalled();
  });

  it('shows the target while a file is over it, through its child too, until the pointer leaves the control', () => {
    const {label, child} = renderTarget();
    const data = withFiles();
    fireEvent.dragEnter(label, {dataTransfer: data});
    expect(dragging(label)).toBe(true);
    // Into the pill: the child's dragenter, then the label's dragleave, as browsers order them.
    fireEvent.dragEnter(child, {dataTransfer: data});
    fireEvent.dragLeave(label, {dataTransfer: data});
    expect(dragging(label)).toBe(true);
    // Out of the pill, and so out of the control: the child's dragleave reaches the label.
    fireEvent.dragLeave(child, {dataTransfer: data});
    expect(dragging(label)).toBe(false);
  });

  it.each([
    {end: 'a drop on it', finish: (label: HTMLElement) => fireEvent.drop(label, {dataTransfer: withFiles(scan('mei.png'))})},
    {end: 'a drop elsewhere', finish: () => fireEvent.drop(window, {dataTransfer: withFiles(scan('mei.png'))})},
    {end: 'a dragend', finish: () => fireEvent.dragEnd(window, {dataTransfer: withFiles()})},
  ])('clears the target on $end, and counts the next drag afresh', ({finish}) => {
    const {label} = renderTarget();
    fireEvent.dragEnter(label, {dataTransfer: withFiles()});
    finish(label);
    expect(dragging(label)).toBe(false);
    // A count the end left behind would hold the next drag's target on after it leaves.
    fireEvent.dragEnter(label, {dataTransfer: withFiles()});
    fireEvent.dragLeave(label, {dataTransfer: withFiles()});
    expect(dragging(label)).toBe(false);
  });

  it('counts the next drag afresh after a drop on it, by its own handler alone', () => {
    // Handed straight to the handlers, the drop reaches no window listener, which would start the count again too.
    const handed = (data: ReturnType<typeof carrying>) => ({dataTransfer: data, preventDefault: () => {}}) as unknown as DragEvent;
    const {result} = renderHook(() => useFileDrop(vi.fn()));
    act(() => result.current.dropProps.onDragEnter(handed(withFiles())));
    act(() => result.current.dropProps.onDrop(handed(withFiles(scan('mei.png')))));
    act(() => result.current.dropProps.onDragEnter(handed(withFiles())));
    act(() => result.current.dropProps.onDragLeave(handed(withFiles())));
    expect(result.current.dragging).toBe(false);
  });
});

describe('useFileDropGuard', () => {
  /** A file drag's `type` event on the page's body, outside every target, and the data it carries. */
  function dispatched(type: 'dragover' | 'drop', data = withFiles(scan('mei.png'))) {
    const event = createEvent(type, document.body, {dataTransfer: data, bubbles: true, cancelable: true});
    fireEvent(document.body, event);
    return {prevented: event.defaultPrevented, data};
  }

  it('refuses a file dragged outside every target, with a no-drop cursor, while mounted, and no longer once unmounted', () => {
    const {unmount} = renderHook(() => useFileDropGuard());
    const over = dispatched('dragover');
    expect(over).toMatchObject({prevented: true, data: {dropEffect: 'none'}});
    // The browser's own drop would open the file in the tab, leaving the page.
    expect(dispatched('drop').prevented).toBe(true);

    unmount();
    expect(dispatched('dragover').prevented).toBe(false);
    expect(dispatched('drop').prevented).toBe(false);
  });

  it('leaves a drag that carries no file to the browser', () => {
    renderHook(() => useFileDropGuard());
    expect(dispatched('dragover', carrying(['text/plain'])).prevented).toBe(false);
    expect(dispatched('drop', carrying(['text/uri-list'])).prevented).toBe(false);
  });

  it("leaves a target's own drag to it: its copy cursor stands", () => {
    renderHook(() => useFileDropGuard());
    const {label} = renderTarget();
    const data = withFiles();
    expect(fireEvent.dragOver(label, {dataTransfer: data})).toBe(false);
    expect(data.dropEffect).toBe('copy');
  });
});
