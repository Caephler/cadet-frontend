import { Card, Text } from '@blueprintjs/core';
import * as React from 'react';

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

export type MenuItem = {
  label: string;
  fn: (position: Position) => void;
  shouldBeShown: (position: Position) => boolean;
};

type Position = {
  row: number;
  column: number;
};

class IDEContextMenuHandler extends React.Component<IOwnProps, IStateProps> {
  private onAltClick: (e: any) => void;
  private openContextMenu: (x: number, y: number) => void;
  private closeContextMenu: () => void;
  private renderContextMenu: () => React.ReactNode;
  private renderContextMenuItems: () => React.ReactNode;
  private menuItemMapper: (item: MenuItem, i: number) => React.ReactNode;

  private get contextMenuStyle() {
    return {
      marginLeft: this.state.x,
      marginTop: this.state.y,
      transform: `${this.shouldBeLeft ? 'translateX(-100%)' : ''} ${
        this.shouldBeTop ? 'translateY(-100%)' : ''
      }`
    };
  }
  private get shouldBeTop() {
    return this.state.y > window.innerHeight - 100;
  }
  private get shouldBeLeft() {
    return this.state.x > window.innerWidth - 150;
  }

  constructor(props: IOwnProps) {
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

    this.menuItemMapper = (item: MenuItem, i: number) => {
      const callback = () => {
        this.closeContextMenu();
        item.fn(this.state.coordsWhenOpened);
      };
      return (
        <div key={i} className="context-menu-item" onClick={callback}>
          <Text>{item.label}</Text>
        </div>
      );
    };

    this.renderContextMenuItems = () => {
      const pos = this.props.editor.getCursorPosition() as Position;
      const shownMenuItems = this.props.menuItems.filter(item => item.shouldBeShown(pos));

      return (
        <>
          {shownMenuItems.map(this.menuItemMapper)}
          {shownMenuItems.length === 0 ? (
            <div className="context-menu-nonclickable-item">
              <Text>
                <em>No actions available</em>
              </Text>
            </div>
          ) : null}
        </>
      );
    };

    this.renderContextMenu = () => {
      if (!this.state.isContextMenuOpen) {
        return null;
      }
      return (
        <div className="IdeContextMenu">
          <div className="background" onClick={this.closeContextMenu}>
            <Card className="context-menu" style={this.contextMenuStyle}>
              {this.renderContextMenuItems()}
            </Card>
          </div>
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
