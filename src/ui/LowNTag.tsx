import {Tag} from './Tag';

/**
 * The "low n" tag: a number that rests on fewer than `minVotes` score votes is
 * thin evidence. The caller decides when it shows and passes its threshold
 * (calibrationModel's LOW_N, which is MIN_RULE_VOTES), and its row's
 * accessible name should say "low n" too, since the tag is only text beside a
 * name. Moved from RulesTable (R3-1a).
 */
export function LowNTag({minVotes}: {minVotes: number}) {
  return <Tag title={`Fewer than ${minVotes} score votes`}>low n</Tag>;
}
