import * as React from 'react';
import { MapStateToProps, connect } from 'react-redux';
import { IState } from 'src/reducers/states';
import IDEContextMenuHandler from './IDEContextMenuHandler';
import { getAllOccurrencesAtCursor, getClosestScoped, Position } from './languageUtils';

interface IEditorWrapperProps extends IStateProps, OwnProps {}
export interface IStateProps {
  chapterNumber: number;
  externalLib: string;
  editorValue: string;
}

export interface OwnProps {
  editor: any;
  addOnCursorChangeCallback: (callback: (pos: Position) => void) => void;
}

export interface OwnState {
  markerIds: number[];
}

class EditorWrapper extends React.Component<IEditorWrapperProps, OwnState> {
  private getClosestScoped: (pos: Position) => void;
  private selectAllOccurrences: (pos: Position) => void;
  private highlightVariables: (pos: Position) => void;

  componentDidMount() {
    this.props.addOnCursorChangeCallback(pos => {
      this.highlightVariables(pos);
    });
  }

  componentWillReceiveProps(nextProps: IEditorWrapperProps) {
    if (nextProps.editorValue !== this.props.editorValue) {
      this.highlightVariables(this.props.editor.getSelection().getCursor());
    }
  }

  constructor(props: IEditorWrapperProps) {
    super(props);
    this.state = {
      markerIds: []
    };

    this.selectAllOccurrences = (pos: Position) => {
      const editor = this.props.editor;
      const code = this.props.editorValue;
      if (!editor) {
        return;
      }
      const ranges = getAllOccurrencesAtCursor(
        code,
        editor.getSession(),
        pos,
        this.props.chapterNumber
      );
      if (!ranges) {
        return;
      }
      const selection = editor.getSelection();
      ranges.forEach(range => selection.addRange(range));
      editor.focus();
    };

    this.getClosestScoped = (pos: Position) => {
      const editor = this.props.editor;
      const code = this.props.editorValue;
      const positionOfDecl = getClosestScoped(
        code,
        editor.getSession(),
        pos,
        this.props.chapterNumber,
        this.props.externalLib
      ); // navigateTo expects 0-indexed row, but we are dealing with 1-indexed rows.
      if (!positionOfDecl) {
        return;
      }
      this.props.editor.navigateTo(positionOfDecl.row - 1, positionOfDecl.column);
      this.props.editor.focus();
    };

    this.highlightVariables = (pos: Position) => {
      // using Ace Editor's way of highlighting as seen here: https://github.com/ajaxorg/ace/blob/master/lib/ace/editor.js#L497
      // We use async blocks so we don't block the browser during editing

      setTimeout(() => {
        const editor = this.props.editor;
        const session = editor.session;
        const code = this.props.editorValue;
        const chapterNumber = this.props.chapterNumber;
        if (!session || !session.bgTokenizer) {
          return;
        }
        this.state.markerIds.forEach(id => {
          session.removeMarker(id);
        });
        const ranges = getAllOccurrencesAtCursor(code, session, pos, chapterNumber, [0]);
        if (!ranges) {
          this.setState({
            markerIds: []
          });
          return;
        }

        const markerType = 'ace_variable_highlighting';
        const markerIds = ranges.map(range => {
          // returns the marker ID for removal later
          return session.addMarker(range, markerType, 'text');
        });
        this.setState({
          markerIds
        });
      }, 10);
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
  externalLib: state.workspaces.playground.externalLibrary,
  editorValue: state.workspaces.playground.editorValue!
});

const ConnectedEditorWrapper = connect(mapStateToProps)(EditorWrapper);
export default ConnectedEditorWrapper;
