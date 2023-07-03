import { SHEET_CELL_TYPE, SheetCell } from "../types";
import * as mathjs from 'mathjs';

export const COLS = 27;
export const ROWS = 50;

export const OPERATORS_REGEX = /([+\-*/=])/;

export const convertRowColToKey = (row: number, col: number) => {
    return (col + 9).toString(36).toUpperCase() + row;
}


export const convertKeyToRowCol = (key: string) => {
    const col = parseInt(key[0], 36) - 9;
    const row = parseInt(key.slice(1));

    return { row, col };
}

export const isTermNumber = (term: string) => {
    return !isNaN(parseInt(term));
}

export const isTermLetter = (term: string) => {
    return /^[a-zA-Z]$/.test(term);
}

export const isTermCell = (term: string) => {
    return term.length > 1 && isTermLetter(term[0]) && isTermNumber(term.slice(1));
}

export const isCharacterOperator = (character: string) => {
    return OPERATORS_REGEX.test(character);
}

export const computeCell = (cell: SheetCell, sheetCellsMap: Map<string, SheetCell>) => {

    if (cell.type === SHEET_CELL_TYPE.Formula) {

        const _cellValueParsed = cell.formula?.trim().split(OPERATORS_REGEX).filter(Boolean).map(term => term.trim().toUpperCase()) || [];
        const _cellValueParsedWithValues: string[] = [];
        for (let i = 1; i < _cellValueParsed.length; i++) {
            const term = _cellValueParsed[i];
            const isCell = isTermCell(term);
            if (isCell) {
                const cellForFormula = sheetCellsMap.get(term);
                _cellValueParsedWithValues.push(cellForFormula?.value || '0');
            } else {
                _cellValueParsedWithValues.push(term);
            }
        }

        try {
            cell.hasError = false;
            cell.value = mathjs.evaluate(_cellValueParsedWithValues.join(''));
        } catch (error) {
            cell.hasError = true;
            cell.value = 'ERR';
        }
    }

    cell.dependents?.forEach(dependentCellKey => {
        const dependentCell = sheetCellsMap.get(dependentCellKey);
        if (dependentCell) {
            computeCell(dependentCell, sheetCellsMap);
        }
    });

}

export const addCellKeyToTargetCellDependents = (targetCell: SheetCell, cellKeyToAdd: string) => {
    const index: number = targetCell?.dependents?.indexOf(cellKeyToAdd) as number;
    if (index < 0) {
        targetCell?.dependents?.push(cellKeyToAdd);
    }
}

export const removeCellKeyFromTargetCellDependents = (targetCell: SheetCell | undefined, cellKeyToRemove: string) => {
    const index: number = targetCell?.dependents?.indexOf(cellKeyToRemove) as number;
    if (index > -1) {
        targetCell?.dependents?.splice(index, 1);
    }
}