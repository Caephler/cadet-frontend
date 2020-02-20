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
  private getAllOccurrences: (pos: Position) => void;

  constructor(props: IEditorWrapperProps) {
    super(props);

    this.getAllOccurrences = (pos: Position) => {
      if (!this.props.editor || !pos) {
        return;
      }

      const parsedProgram = parse(this.props.editorValue, createContext(this.props.chapterNumber));
      const editSession = this.props.editor.getSession();
      // We get the tokens around as well, just to be sure
      const centerToken = editSession.getTokenAt(pos.row, pos.column);
      const leftToken = editSession.getTokenAt(pos.row, Math.max(pos.column - 1, 0));
      const rightToken = editSession.getTokenAt(pos.row, pos.column + 1);

      // Check if token is identifier
      if (!centerToken || !leftToken || !rightToken) {
        return;
      }

      const tokenArr = [centerToken, leftToken, rightToken];
      for (let token of tokenArr) {
        if (token.type === 'identifier') {
          const tokenName = token.value;
          // We need 1-indexed row here
          const result = getAllOccurrencesInScope(
            tokenName,
            pos.row + 1,
            pos.column,
            parsedProgram!
          );
          if (!result) {
            continue;
          }

          console.log(result);
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
      }
    };

    this.getClosestScoped = (pos: Position) => {
      if (!this.props.editor || !pos) {
        return;
      }

      const parsedProgram = parse(this.props.editorValue, createContext(this.props.chapterNumber));
      const scopedProgram = scopeVariables(parsedProgram as any);
      const editSession = this.props.editor.getSession();
      // We get the tokens around as well, just to be sure
      const centerToken = editSession.getTokenAt(pos.row, pos.column);
      const leftToken = editSession.getTokenAt(pos.row, Math.max(pos.column - 1, 0));
      const rightToken = editSession.getTokenAt(pos.row, pos.column + 1);

      // Check if token is identifier
      if (!centerToken || !leftToken || !rightToken) {
        return;
      }

      const tokenArr = [centerToken, leftToken, rightToken];
      for (let token of tokenArr) {
        if (token.type === 'identifier') {
          const tokenName = token.value;
          // We need 1-indexed row here
          const result = lookupDefinition(tokenName, pos.row + 1, pos.column, scopedProgram);
          if (!result) {
            continue;
          }

          const resRow = result.loc!.start.line;
          const resCol = result.loc!.start.column;

          console.log(`${tokenName} found at line ${resRow}, col ${resCol}`);
          // navigateTo expects 0-indexed row, but we are dealing with 1-indexed rows.
          this.props.editor.navigateTo(resRow - 1, resCol);
          this.props.editor.focus();
          break;
        }
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
              this.getAllOccurrences(pos);
            }
          },
          {
            label: 'Go to definition',
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
