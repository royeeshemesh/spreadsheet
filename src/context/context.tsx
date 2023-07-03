import React, { createContext, useCallback, useEffect, useMemo } from 'react';
import { SHEET_CELL_TYPE, SheetCell } from '../types';
import { OPERATORS_REGEX, addCellKeyToTargetCellDependents, computeCell, convertKeyToRowCol, convertRowColToKey, isTermCell, isTermNumber, removeCellKeyFromTargetCellDependents } from './utils';

type SheetContextType = {
    selectedRow: number;
    selectedCol: number;
    cellEditMode: boolean;
    cellEditValue: string;
    waitingForTerm: boolean;
    sheetCellsMap: Map<string, SheetCell>;
    sheetFormulaCellsMap: Map<string, SheetCell>;
    selectedCellForFormula?: SheetCell;
    onSelect: (row: number, col: number) => void;
    onCellEdit: (term?: string) => void;
    onCellEditFinish: () => void;
    onCellEditCancel: () => void;
    onCellEditValueChange: (value: string) => void;
    onCellEditValueKeyup: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    setSelectedRow: (row: number) => void;
    setSelectedCol: (col: number) => void;
};

export const SheetContext = createContext<SheetContextType>({
} as SheetContextType);

export const SheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedRow, setSelectedRow] = React.useState<number>(0);
    const [selectedCol, setSelectedCol] = React.useState<number>(0);
    const [cellEditMode, setCellEditMode] = React.useState<boolean>(false);
    const [cellEditValue, setCellEditValue] = React.useState<string>('');
    const [waitingForTerm, setWaitingForTerm] = React.useState<boolean>(false);
    const [sheetCells, setSheetCells] = React.useState<SheetCell[]>(
        [
            {
                "row": 1,
                "col": 1,
                "type": SHEET_CELL_TYPE.Number,
                "dependents": [
                    "C1"
                ],
                "value": "1"
            },
            {
                "row": 1,
                "col": 2,
                "type": SHEET_CELL_TYPE.Number,
                "dependents": [
                    "C1"
                ],
                "value": "1"
            },
            {
                "row": 1,
                "col": 3,
                "type": SHEET_CELL_TYPE.Formula,
                "dependents": [
                    "D1"
                ],
                "formula": "=A1+B1",
                "hasError": false,
                "value": "2"
            },
            {
                "row": 1,
                "col": 5,
                "type": SHEET_CELL_TYPE.Number,
                "value": "100",
                "dependents": [
                    "D1"
                ]
            },
            {
                "row": 1,
                "col": 4,
                "type": SHEET_CELL_TYPE.Formula,
                "dependents": [],
                "formula": "=C1+E1",
                "hasError": false,
                "value": "102"
            }
        ]
    );
    const [selectedCellForFormula, setSelectedCellForFormula] = React.useState<SheetCell>();
    const [sheetFormulaCells, setSheetFormulaCells] = React.useState<SheetCell[]>([]);

    const sheetFormulaCellsMap: Map<string, SheetCell> = useMemo(() => {
        const sheetFormulaCellsMap: Map<string, SheetCell> = new Map();
        sheetFormulaCells.forEach((cell: SheetCell) => {
            const cellKey = convertRowColToKey(cell.row, cell.col);
            sheetFormulaCellsMap.set(cellKey, cell);
        });

        return sheetFormulaCellsMap;
    }, [sheetFormulaCells]);

    const sheetCellsMap: Map<string, SheetCell> = useMemo(() => {
        const sheetCellsMap: Map<string, SheetCell> = new Map();
        sheetCells.forEach((cell: SheetCell) => {
            const cellKey = convertRowColToKey(cell.row, cell.col);
            sheetCellsMap.set(cellKey, cell);
        });
        return sheetCellsMap;
    }, [sheetCells]);

    useEffect(() => {
        // in case this is not the beginning of the a formula nothing to do here
        if (cellEditValue[0] !== '=') {
            return;
        }

        // parse the cell formula intro terms and operators
        const cellEditValueParsed = cellEditValue.trim().split(OPERATORS_REGEX).filter(Boolean).map(term => term.toUpperCase());

        // create a list of cells that are part of the formula
        const _sheetFormulaCells: SheetCell[] = [];
        for (let term of cellEditValueParsed) {
            const isNumber = !isNaN(Number(term));
            const isOperator = OPERATORS_REGEX.test(term);
            if (!isNumber && !isOperator) {
                const { row, col } = convertKeyToRowCol(term);
                // if this is an in progress selction for formula, don't add the cell to the list yet
                if (row && col && (selectedCellForFormula?.col !== col || selectedCellForFormula?.row !== row)) {
                    const cell = sheetCellsMap.get(term) || {
                        row,
                        col,
                        type: SHEET_CELL_TYPE.Number,
                        value: ''
                    };
                    _sheetFormulaCells.push(cell);
                }
            }
        }

        // check if last term is an operator
        const lastTermIsOperator = OPERATORS_REGEX.test(cellEditValueParsed[cellEditValueParsed.length - 1]);

        if (lastTermIsOperator) {
            // if last term is an operator, add the selected new cell to the list and accept a new selection
            if (selectedCellForFormula) {
                const cellKey = convertRowColToKey(selectedCellForFormula.row, selectedCellForFormula.col);
                const existedCellInSheet = sheetCellsMap.get(cellKey);
                const cell: SheetCell = {
                    row: selectedCellForFormula.row,
                    col: selectedCellForFormula.col,
                    type: existedCellInSheet?.type || SHEET_CELL_TYPE.Number,
                    value: existedCellInSheet?.value || ''
                };

                _sheetFormulaCells.push(cell);
                setSelectedCellForFormula(undefined);
            }
            setWaitingForTerm(true);
        } else {
            // if last term is not an operator no need to except a new selection
            if (!selectedCellForFormula) {
                setWaitingForTerm(false);
            }
        }

        // set new formula cells list
        setSheetFormulaCells([..._sheetFormulaCells]);

    }, [cellEditValue, selectedCellForFormula, sheetCellsMap]);

    useEffect(() => {
        if (!cellEditMode) {
            setSelectedCellForFormula(undefined);

            setWaitingForTerm(false);
        }
    }, [cellEditMode]);

    const onCellEditFinish = useCallback(() => {
        // get celected cell, if not exists create it
        const cellKey = convertRowColToKey(selectedRow, selectedCol);
        let sheetCell = sheetCellsMap.get(cellKey) || {
            row: selectedRow,
            col: selectedCol,
            type: SHEET_CELL_TYPE.Number,
            dependents: []
        };

        // create an inner map of the sheet cells
        const _sheetCellsMap = new Map(sheetCellsMap);

        // create a list of new cells to add to the sheet
        const _newSheetCells: SheetCell[] = [];

        // check if user selcted a cell for formula using the mouse
        if (selectedCellForFormula) {
            const selectedCellForFormulaKey = convertRowColToKey(selectedCellForFormula.row, selectedCellForFormula.col);
            const cellForFormula = _sheetCellsMap.get(selectedCellForFormulaKey) || {
                row: selectedCellForFormula.row,
                col: selectedCellForFormula.col,
                type: SHEET_CELL_TYPE.Number,
                value: '',
                dependents: []
            };

            addCellKeyToTargetCellDependents(cellForFormula, cellKey);

            if (!_sheetCellsMap.get(selectedCellForFormulaKey)) {
                _newSheetCells.push(cellForFormula);
                _sheetCellsMap.set(selectedCellForFormulaKey, cellForFormula);
            }
        }

        const cellEditValueParsed = cellEditValue.trim().split(OPERATORS_REGEX).filter(Boolean).map(term => term.trim().toUpperCase());
        if (cellEditValueParsed.length > 1) {
            // remove the cell from the dependents of the cells that it was dependent on
            sheetCell.formula?.trim().split(OPERATORS_REGEX).filter(Boolean).map(term => term.trim().toUpperCase()).forEach(term => {
                const isCell = isTermCell(term);
                if (isCell) {
                    removeCellKeyFromTargetCellDependents(_sheetCellsMap.get(term), cellKey);
                }
            });

            // add the cell to the dependents of the cells that it is dependent on 
            // create new cells if needed
            // get formula cells values
            for (let i = 1; i < cellEditValueParsed.length; i++) {
                const term = cellEditValueParsed[i];
                const isCell = isTermCell(term);
                if (isCell) {
                    const { row, col } = convertKeyToRowCol(term);
                    const cellForFormula = _sheetCellsMap.get(term) || {
                        row,
                        col,
                        type: SHEET_CELL_TYPE.Number,
                        value: '',
                        dependents: [],
                    };
                    addCellKeyToTargetCellDependents(cellForFormula, cellKey);
                    if (!_sheetCellsMap.get(term)) {
                        _sheetCellsMap.set(term, cellForFormula);
                        _newSheetCells.push(cellForFormula);
                    }
                }
            }

            sheetCell.type = SHEET_CELL_TYPE.Formula;
            sheetCell.formula = cellEditValueParsed.join('');

        } else {
            sheetCell.type = isTermNumber(cellEditValueParsed[0]) ? SHEET_CELL_TYPE.Number : SHEET_CELL_TYPE.Text;
            sheetCell.value = cellEditValueParsed[0];
        }

        computeCell(sheetCell, _sheetCellsMap);

        !sheetCellsMap.get(cellKey) && _newSheetCells.push(sheetCell);
        setSheetCells([...sheetCells, ..._newSheetCells]);
        setSheetFormulaCells([]);
        setCellEditValue('');
        setCellEditMode(false);
        setWaitingForTerm(false);
        setSelectedCellForFormula(undefined);
    }, [cellEditValue, selectedCellForFormula, selectedCol, selectedRow, sheetCellsMap, sheetCells]);

    const onSelect = useCallback((row: number, col: number): void => {
        if (waitingForTerm) {
            const cellKey = convertRowColToKey(row, col);

            const cellEditValueParsed = cellEditValue.split(OPERATORS_REGEX).filter(Boolean);

            if (selectedCellForFormula) {
                cellEditValueParsed[cellEditValueParsed.length - 1] = cellKey;
            } else {
                cellEditValueParsed.push(cellKey);
            }

            setCellEditValue(cellEditValueParsed.join(''));

            const existedCellInSheet = sheetCellsMap.get(cellKey);
            const cell: SheetCell = {
                row,
                col,
                type: existedCellInSheet?.type || SHEET_CELL_TYPE.Number,
                value: existedCellInSheet?.value || '0'
            };

            setSelectedCellForFormula(cell);
            return;
        }

        if (cellEditMode && cellEditValue.length > 0) {
            onCellEditFinish();
        }

        setSelectedRow(row);
        setSelectedCol(col);
    }, [waitingForTerm, cellEditMode, cellEditValue, sheetCellsMap, selectedCellForFormula, onCellEditFinish]);


    const onCellEdit = useCallback((term?: string) => {
        setCellEditMode(true);
        const cellKey = convertRowColToKey(selectedRow, selectedCol);
        const cell = sheetCellsMap.get(cellKey);

        if (cell) {
            const value = cell.type === SHEET_CELL_TYPE.Formula ? cell.formula : (cell.value || '');
            setCellEditValue(term || value || '');
        } else {
            setCellEditValue(term || '');
        }

    }, [selectedRow, selectedCol, sheetCellsMap]);

    const onCellEditValueChange = useCallback((value: string) => {
        setCellEditValue(value);
    }, []);

    const onCellEditCancel = useCallback(() => {
        setCellEditMode(false);
        setCellEditValue('');
        setWaitingForTerm(false);
        setSelectedCellForFormula(undefined);
        setSheetFormulaCells([]);
    }, []);

    const onCellEditValueKeyup = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            onCellEditFinish();
        } else if (event.key === 'Escape') {
            onCellEditCancel();
        }
    }, [onCellEditFinish, onCellEditCancel]);


    const contextValue = useMemo(() => {
        return {
            selectedRow,
            selectedCol,
            cellEditMode,
            waitingForTerm,
            sheetCellsMap,
            sheetFormulaCellsMap,

            onSelect,
            onCellEdit,
            onCellEditFinish,
            onCellEditValueChange,
            onCellEditValueKeyup,
            cellEditValue,
            onCellEditCancel,
            selectedCellForFormula,
            setSelectedRow,
            setSelectedCol,

        };
    }, [
        selectedRow,
        selectedCol,
        cellEditMode,
        waitingForTerm,
        sheetCellsMap,
        sheetFormulaCellsMap,

        onSelect,
        onCellEdit,
        onCellEditFinish,
        onCellEditValueChange,
        onCellEditValueKeyup,
        cellEditValue,
        onCellEditCancel,
        selectedCellForFormula,
        setSelectedRow,
        setSelectedCol,

    ]);

    return (
        <SheetContext.Provider value={{ ...contextValue }}>
            {children}
        </SheetContext.Provider>
    );
}

export const useSheet = () => React.useContext(SheetContext);




