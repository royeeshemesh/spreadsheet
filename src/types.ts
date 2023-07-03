export enum SHEET_CELL_TYPE {
    Text,
    Number,
    Formula
  }
  
  export type SheetCell = {
    row: number,
    col: number,
    value?: string,
    type: SHEET_CELL_TYPE,
    formula?: string,
    dependents?: string[],
    hasError?: boolean,
  }
