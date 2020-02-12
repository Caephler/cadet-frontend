import { Button, Card, InputGroup, Pre, Text } from '@blueprintjs/core';
import { createContext, lookupDefinition, scopeVariables } from 'js-slang';
import { parse } from 'js-slang/dist/parser';
import * as React from 'react';
import { connect, MapStateToProps } from 'react-redux';
import { IState } from 'src/reducers/states';

interface IFloatingHelperProps extends IStateProps, OwnProps {}

export interface IStateProps {
  chapterNumber: number;
  editorValue: string;
}

export interface OwnProps {
  editorCursor: { row: number; column: number };
  jumpTo: (row: number, col: number) => void;
}

type OwnState = {
  searchVar: string;
  console: string[];
  isMinimized: boolean;
};

class FloatingHelper extends React.Component<IFloatingHelperProps, OwnState> {
  constructor(props: IFloatingHelperProps) {
    super(props);
    this.state = {
      searchVar: '',
      console: [],
      isMinimized: false
    };
  }

  private log(message: string) {
    this.setState(prevState => ({
      ...prevState,
      console: [message, ...prevState.console]
    }));
  }

  public render() {
    const helperStyle: {} = {
      width: '400px',
      position: 'fixed',
      right: 0,
      bottom: 0,
      zIndex: 99
    };

    const preStyle: {} = {
      height: '250px',
      overflow: 'scroll'
    };

    const headerStyle: {} = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px'
    };

    return (
      <Card style={helperStyle}>
        <div style={headerStyle}>
          <Text>Helper</Text>
          <Button
            onClick={() =>
              this.setState(prevState => ({
                ...prevState,
                isMinimized: !prevState.isMinimized
              }))
            }
            text="_"
          />
        </div>
        {this.state.isMinimized ? null : (
          <>
            <Text>Variable</Text>
            <InputGroup
              onChange={(e: any) => {
                this.setState({
                  searchVar: e.target.value
                });
              }}
              value={this.state.searchVar}
            />
            <Text>Search Position</Text>
            <Text>Row: {this.props.editorCursor.row + 1}</Text>
            <Text>Col: {this.props.editorCursor.column}</Text>
            <Button
              text="Find"
              onClick={() => {
                this.log(
                  `Searching code for variable ${this.state.searchVar} at (row, col): (${this.props.editorCursor.row + 1}, ${this.props.editorCursor.column})`
                );
                const parsedProgram = parse(
                  this.props.editorValue,
                  createContext(this.props.chapterNumber)
                );
                if (!parsedProgram) {
                  this.log('Code is not well formed.');
                  return;
                }
                const scoped = scopeVariables(parsedProgram as any);
                const result = lookupDefinition(
                  this.state.searchVar,
                  this.props.editorCursor.row + 1,
                  this.props.editorCursor.column,
                  scoped
                );

                if (!result) {
                  this.log(`Variable not found.`);
                  return;
                }

                const resRow = result.loc!.start.line;
                const resCol = result.loc!.start.column;

                this.log(`${this.state.searchVar} found at line ${resRow}, col ${resCol}`);
                this.props.jumpTo(resRow - 1, resCol);
              }}
            />
            <Pre style={preStyle}>{this.state.console.join('\n')}</Pre>
          </>
        )}
      </Card>
    );
  }
}

const mapStateToProps: MapStateToProps<IStateProps, {}, IState> = state => ({
  chapterNumber: state.workspaces.playground.context.chapter,
  editorValue: state.workspaces.playground.editorValue!
});

export default connect(mapStateToProps)(FloatingHelper);
