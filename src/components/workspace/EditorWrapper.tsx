import * as React from 'react';
import { MapStateToProps, connect } from 'react-redux';
import { createContext, lookupDefinition, scopeVariables } from 'js-slang';
import { parse } from 'js-slang/dist/parser';
import { IState } from 'src/reducers/states';

interface IEditorWrapperProps extends IStateProps, OwnProps {}
export interface IStateProps {
  chapterNumber: number;
  editorValue: string;
}

export interface OwnProps {
  editor: any,
  children: React.ReactNodeArray | React.ReactNode
}

type Position = {
  row: number;
  column: number;
}

class EditorWrapper extends React.Component<IEditorWrapperProps, {}> {
  private onMetaClick: (e: any) => void;
  private getClosestScoped: (pos: Position) => void;

  constructor(props: IEditorWrapperProps) {
    super(props);
    this.onMetaClick = (e: any) => {
      if (e.altKey && this.props.editor) {
        const pos = this.props.editor.getCursorPosition() as Position;
        // getCursorPosition returns us 0-indexed row
        this.getClosestScoped({ row: pos.row, column: pos.column });
      }
    }
    this.getClosestScoped = (pos: Position) => {
      if (!this.props.editor) {
        return;
      }
      const parsedProgram = parse(
        this.props.editorValue,
        createContext(this.props.chapterNumber)
      );

      const scopedProgram = scopeVariables(parsedProgram as any);

      const editSession = this.props.editor.getSession();
      // We get the tokens around as well, just to be sure
      const centerToken = editSession.getTokenAt(pos.row, pos.column);
      const leftToken = editSession.getTokenAt(pos.row, Math.max(pos.column - 1, 0));
      const rightToken = editSession.getTokenAt(pos.row, pos.column + 1);
      
      // Check if token is identifier
      if (!centerToken || !leftToken || !rightToken) {
        console.log(pos);
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
    }
  }

  public render() {
    return (
      <div className="row editor-react-ace" onClick={this.onMetaClick}>
        { this.props.children }
      </div>
    )
  }
}

const mapStateToProps: MapStateToProps<IStateProps, {}, IState> = state => ({
  chapterNumber: state.workspaces.playground.context.chapter,
  editorValue: state.workspaces.playground.editorValue!
});

export default connect(mapStateToProps)(EditorWrapper);