import * as React from 'react';
import { Card, Text } from '@blueprintjs/core';

export interface IOwnProps {
  editor: any;
  menuItems: MenuItem[];
  children: React.ReactNodeArray | React.ReactNode;
}

export interface IStateProps {
  isContextMenuOpen: boolean;
  coordsWhenOpened: Position;
  x: number;
  y: number;
}

export interface MenuItem {
  label: string;
  fn: (position: Position) => void;
  shouldBeShown: (position: Position) => boolean;
}

type Position = {
  row: number;
  column: number;
};

interface IIDEContextMenuHandlerProps extends IOwnProps {}

class IDEContextMenuHandler extends React.Component<IIDEContextMenuHandlerProps, IStateProps> {
  private onAltClick: (e: any) => void;
  private openContextMenu: (x: number, y: number) => void;
  private closeContextMenu: () => void;
  private renderContextMenu: () => React.ReactNode;

  constructor(props: IIDEContextMenuHandlerProps) {
    super(props);
    this.state = {
      isContextMenuOpen: false,
      x: 0,
      y: 0,
      coordsWhenOpened: { row: 0, column: 0 }
    };

    this.onAltClick = (e: any) => {
      if (!e.altKey || !this.props.editor) {
        return;
      }
      this.openContextMenu(e.clientX, e.clientY);
    };

    this.openContextMenu = (x: number = 0, y: number = 0) => {
      const pos = this.props.editor.getCursorPosition() as Position;
      this.setState({
        isContextMenuOpen: true,
        x,
        y,
        coordsWhenOpened: { row: pos.row, column: pos.column }
      });
    };

    this.closeContextMenu = () => {
      this.setState({
        isContextMenuOpen: false
      });
    };

    this.renderContextMenu = () => {
      if (!this.state.isContextMenuOpen) {
        return null;
      }
      const pos = this.props.editor.getCursorPosition() as Position;
      const shownMenuItems = this.props.menuItems.filter(item => item.shouldBeShown(pos));
      return (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            zIndex: 1000
          }}
          onClick={this.closeContextMenu}
        >
          <Card
            style={{
              position: 'relative',
              padding: '4px',
              width: '150px',
              marginLeft: this.state.x,
              marginTop: this.state.y,
              zIndex: 1001
            }}
          >
            {shownMenuItems.map((item: MenuItem, i) => (
                <div
                  key={i}
                  style={{
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  onClick={() => {
                    this.closeContextMenu();
                    item.fn(this.state.coordsWhenOpened);
                  }}
                >
                  <Text>{item.label}</Text>
                </div>
            )
            )}
            {shownMenuItems.length === 0 ? (
              <div style={{ padding: '4px' }}>
                <Text><em>No actions available</em></Text>
              </div>
            ) : null }
          </Card>
        </div>
      );
    };
  }

  public render() {
    return (
      <>
        {this.renderContextMenu()}
        <div
          onClick={this.onAltClick}
          style={{
            width: '100%',
            height: '100%'
          }}
        >
          {this.props.children}
        </div>
      </>
    );
  }
}

export default IDEContextMenuHandler;
