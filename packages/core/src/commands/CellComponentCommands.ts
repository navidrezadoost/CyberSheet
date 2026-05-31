import type { Command } from '../CommandManager';
import type { Address, CustomCellComponent } from '../types';
import type { Worksheet } from '../worksheet';

function cloneComponent(component: CustomCellComponent | undefined): CustomCellComponent | undefined {
  if (!component) return undefined;
  return JSON.parse(JSON.stringify(component)) as CustomCellComponent;
}

export class SetCellComponentCommand implements Command {
  description = 'Set cell component';

  private worksheet: Worksheet;
  private address: Address;
  private previousComponent: CustomCellComponent | undefined;
  private nextComponent: CustomCellComponent | undefined;

  constructor(
    worksheet: Worksheet,
    address: Address,
    component: CustomCellComponent | undefined,
  ) {
    this.worksheet = worksheet;
    this.address = address;
    this.previousComponent = cloneComponent(worksheet.getCellComponent(address));
    this.nextComponent = cloneComponent(component);
  }

  execute(): void {
    this.worksheet.setCellComponent(this.address, this.nextComponent);
  }

  undo(): void {
    this.worksheet.setCellComponent(this.address, this.previousComponent);
  }
}
