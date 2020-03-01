import * as React from 'react';
import { MapStateToProps, connect } from 'react-redux';
import {
  createContext,
  lookupDefinition,
  scopeVariables
  // getAllOccurrencesInScope
} from 'js-slang';
import { parse } from 'js-slang/dist/parser';
import { IState } from 'src/reducers/states';
import IDEContextMenuHandler from './IDEContextMenuHandler';
import { getAllOccurrencesInScope } from 'js-slang/dist/scoped-vars';

interface IEditorWrapperProps extends IStateProps, OwnProps {}
export interface IStateProps {
  chapterNumber: number;
  editorValue: string;
}

export interface OwnProps {
  editor: any;
  children: React.ReactNodeArray | React.ReactNode;
}

type Position = {
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

class EditorWrapper extends React.Component<IEditorWrapperProps, {}> {
  private getClosestScoped: (pos: Position) => void;
  private selectAllOccurrences: (pos: Position) => void;
  private parseProgram: () => any;
  private getMatchingTokens: (pos: Position, types: string[]) => any;
  private doesMatchType: (token: { type: string }, types: string[]) => boolean;

  constructor(props: IEditorWrapperProps) {
    super(props);
    const identifierTypes = ['identifier', 'variable.parameter', 'entity.name.function'];

    this.parseProgram = () => {
      if (!this.props.editor) {
        return;
      }

      const parsedProgram = parse(this.props.editorValue, createContext(this.props.chapterNumber));
      return parsedProgram;
    };

    this.doesMatchType = (token: { type: string }, types: string[]) => {
      if (!token) {
        return false;
      }
      return types.reduce((matched, type) => matched || type === token.type, false);
    };

    this.getMatchingTokens = (pos: Position, types: string[]) => {
      if (!pos) {
        return;
      }

      const editSession = this.props.editor.getSession();
      // We get the tokens around as well, just to be sure
      const centerToken = editSession.getTokenAt(pos.row, pos.column);
      const leftToken = editSession.getTokenAt(pos.row, Math.max(pos.column - 1, 0));
      const rightToken = editSession.getTokenAt(pos.row, pos.column + 1);

      const tokenArr = [centerToken, leftToken, rightToken];
      return tokenArr.filter(token => token && this.doesMatchType(token, types));
    };

    this.selectAllOccurrences = (pos: Position) => {
      const parsedProgram = this.parseProgram();
      if (parsedProgram === undefined) {
        // TODO: Alert user that the program could not be parsed.
        return;
      }

      const matchedTokens = this.getMatchingTokens(pos, identifierTypes);
      for (let token of matchedTokens) {
        const tokenName = token.value;
        const result = getAllOccurrencesInScope(tokenName, pos.row + 1, pos.column, parsedProgram!);
        // We need 1-indexed row here
        if (!result) {
          continue;
        }

        result.forEach(loc => {
          const range = {
            startRow: loc.start.line - 1, // loc is 1-indexed, range is 0-indexed.
            startColumn: loc.start.column,
            endRow: loc.start.line - 1,
            endColumn: loc.end.column
          };
          const aceRange = new Range(
            range.startRow,
            range.startColumn,
            range.endRow,
            range.endColumn
          );
          const selection = this.props.editor.getSelection();
          selection.addRange(aceRange);
        });
        this.props.editor.focus();

        break;
      }
    };

    this.getClosestScoped = (pos: Position) => {
      const parsedProgram = this.parseProgram();
      if (parsedProgram === undefined) {
        // TODO: Alert user that the program could not be parsed.
        return;
      }
      const scopedProgram = scopeVariables(parsedProgram as any);
      if (!scopedProgram) {
        console.log('unable to scope program');
        return;
      }
      const matchedTokens = this.getMatchingTokens(pos, identifierTypes);
      for (let token of matchedTokens) {
        const tokenName = token.value;
        // We need 1-indexed row here
        const result = lookupDefinition(tokenName, pos.row + 1, pos.column, scopedProgram);
        if (!result) {
          continue;
        }

        const resRow = result.loc!.start.line;
        const resCol = result.loc!.start.column;

        // navigateTo expects 0-indexed row, but we are dealing with 1-indexed rows.
        this.props.editor.navigateTo(resRow - 1, resCol);
        this.props.editor.focus();
        break;
      }
    };
  }

  public render() {
    return (
      <IDEContextMenuHandler
        editor={this.props.editor}
        menuItems={[
          {
            label: 'Refactor',
            fn: (pos: Position) => {
              this.selectAllOccurrences(pos);
            }
          },
          {
            label: 'Go to declaration',
            fn: (pos: Position) => {
              this.getClosestScoped(pos);
            }
          }
        ]}
      >
        <div className="row editor-react-ace">{this.props.children}</div>
      </IDEContextMenuHandler>
    );
  }
}

const mapStateToProps: MapStateToProps<IStateProps, {}, IState> = state => ({
  chapterNumber: state.workspaces.playground.context.chapter,
  editorValue: state.workspaces.playground.editorValue!
});

export default connect(mapStateToProps)(EditorWrapper);
