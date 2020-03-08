import {
  createContext,
  lookupDefinition,
  scopeVariables,
  getAllOccurrencesInScope
} from 'js-slang';
import { parse, looseParse } from 'js-slang/dist/parser';

export type Position = {
  row: number;
  column: number;
};

// We need to create a [Range](https://ace.c9.io/#nav=api&api=range) object
// But react-ace does not expose the constructor, so we will use a hacky way to obtain
// the constructor.
const ace = (() => {
  return (window as any).ace;
})() as any;
const { Range } = ace.acequire('ace/range');
const identifierTypes = ['identifier', 'variable.parameter', 'entity.name.function'];
export { Range };

export const parseProgram = (code: string, chapterNumber: number) => {
  const program = parse(code, createContext(chapterNumber));
  if (program == null) {
    return looseParse(code, createContext(chapterNumber));
  }
  return program;
};

export const doesMatchType = (token: { type: string }, types: string[]) => {
  if (!token) {
    return false;
  }
  return types.reduce((matched, type) => matched || type === token.type, false);
};

export const getMatchingTokens = (
  session: any,
  pos: Position,
  types: string[],
  offsets: number[] = [-1, 0, 1]
): any => {
  if (!pos) {
    return;
  }

  const tokens = offsets.map(offset =>
    session.getTokenAt(pos.row, Math.max(pos.column + offset, 0))
  );
  return tokens.filter(token => token && doesMatchType(token, types));
};

export const getAllOccurrencesAtCursor = (
  code: string,
  session: any,
  pos: Position,
  chapterNumber: number,
  offsetsToCheck: number[] = [-1, 0, 1]
) => {
  const parsedProgram = parseProgram(code, chapterNumber);

  const matchedTokens = getMatchingTokens(session, pos, identifierTypes, offsetsToCheck);
  for (let token of matchedTokens) {
    const tokenName = token.value;
    const result = getAllOccurrencesInScope(tokenName, pos.row + 1, pos.column, parsedProgram!);
    // We need 1-indexed row here
    if (!result) {
      continue;
    }

    return result.map(loc => {
      const range = {
        startRow: loc.start.line - 1, // loc is 1-indexed, range is 0-indexed.
        startColumn: loc.start.column,
        endRow: loc.start.line - 1,
        endColumn: loc.end.column
      };
      const aceRange = new Range(range.startRow, range.startColumn, range.endRow, range.endColumn);

      return aceRange;
    });
  }

  // no match
  return;
};

export const getClosestScoped = (
  code: string,
  session: any,
  pos: Position,
  chapterNumber: number
): Position | undefined => {
  const parsedProgram = parseProgram(code, chapterNumber);

  const scopedProgram = scopeVariables(parsedProgram as any);
  if (!scopedProgram) {
    console.log('unable to scope program');
    return;
  }
  const matchedTokens = getMatchingTokens(session, pos, identifierTypes);
  for (let token of matchedTokens) {
    const tokenName = token.value;
    // We need 1-indexed row here
    const result = lookupDefinition(tokenName, pos.row + 1, pos.column, scopedProgram);
    if (!result) {
      continue;
    }

    const resRow = result.loc!.start.line;
    const resCol = result.loc!.start.column;

    return {
      row: resRow,
      column: resCol
    };
  }

  // no match
  return;
};
