// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {describe, expect, it} from 'vitest';
import {EVENT_QUERIES} from '../vercelAnalytics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
/** The app's typed event catalog at the pin: every event it sends, with its properties. */
const CATALOG_PATH = path.join(ROOT, 'upstream/inkweave/apps/web/src/shared/lib/analytics.ts');

/** The members' names of a type literal, or none for any other type. */
function memberNames(type) {
  return ts.isTypeLiteralNode(type) ? type.members.map((member) => member.name.text) : [];
}

/** The pinned app's AnalyticsEvents: each event's name, and its properties' names. */
function readCatalog(text) {
  const source = ts.createSourceFile(CATALOG_PATH, text, ts.ScriptTarget.Latest);
  const alias = source.statements.find(
    (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'AnalyticsEvents',
  );
  if (!alias || !ts.isTypeLiteralNode(alias.type)) throw new Error(`no AnalyticsEvents type literal in ${CATALOG_PATH}`);
  return new Map(alias.type.members.map((member) => [member.name.text, memberNames(member.type)]));
}

/**
 * What `query` names that its event doesn't send: the event itself when the catalog
 * lacks it, else each eventData breakdown's prop and each `where` prop its event lacks.
 * A dimension breakdown (deviceType) is Vercel's own, so the catalog never holds it.
 */
function unknownNames(query, catalog) {
  const props = catalog.get(query.name);
  if (!props) return [query.name];
  const named = query.breakdowns.flatMap((b) => [
    ...(b.source === 'dimension' ? [] : [b.prop]),
    ...Object.keys(b.where ?? {}),
  ]);
  return [...new Set(named.filter((prop) => !props.includes(prop)))].map((prop) => `${query.name}.${prop}`);
}

describe('EVENT_QUERIES against the pinned app catalog', () => {
  const catalog = readCatalog(fs.readFileSync(CATALOG_PATH, 'utf8'));

  it.each(EVENT_QUERIES.map((query) => [query.name, query]))(
    '%s is an event the app sends, broken down by its own properties',
    (_name, query) => {
      expect(unknownNames(query, catalog)).toEqual([]);
    },
  );
});

describe('the catalog check bites', () => {
  const catalog = readCatalog(`type AnalyticsEvents = {
    binder_view_changed: {control: 'set' | 'show'; value: string; friend: boolean};
  };`);

  it('reads each event with its properties', () => {
    expect(catalog).toEqual(new Map([['binder_view_changed', ['control', 'value', 'friend']]]));
  });

  it('names an event the catalog lacks', () => {
    expect(unknownNames({name: 'binder_view_changd', breakdowns: []}, catalog)).toEqual(['binder_view_changd']);
  });

  it("names a breakdown's prop and a where prop the event lacks, but never a dimension", () => {
    const query = {
      name: 'binder_view_changed',
      breakdowns: [
        {prop: 'contrl', label: 'By control'},
        {prop: 'value', label: 'Sets picked', where: {mode: 'set'}},
        {prop: 'deviceType', label: 'By device', source: 'dimension'},
      ],
    };
    expect(unknownNames(query, catalog)).toEqual(['binder_view_changed.contrl', 'binder_view_changed.mode']);
  });

  it('fails loudly when the catalog has no AnalyticsEvents', () => {
    expect(() => readCatalog('type Events = {};')).toThrow(/no AnalyticsEvents/);
  });
});
