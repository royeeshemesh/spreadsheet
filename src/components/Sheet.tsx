import { CSSProperties, useEffect } from "react";
import Cell from "./Cell";
import { useSheet } from "../context/context";
import { isTermLetter, isTermNumber, ROWS, COLS, convertRowColToKey } from "../context/utils";

const ColHeader = ({ col, selected }: { col: number, selected: boolean }) => {
    return (
        <div className={'cell col-header ' + (selected ? 'selected' : '')}>
            {(col + 9).toString(36).toUpperCase()}
        </div>
    );
}

const RowHeader = ({ row, selected }: { row: number, selected: boolean }) => {
    return (
        <div className={'cell row-header ' + (selected ? 'selected' : '')}>
            {row}
        </div>
    );
}

const Sheet = () => {
    const {
        selectedCol,
        selectedRow,
        sheetCellsMap,
        cellEditMode,
        waitingForTerm,
        selectedCellForFormula,
        sheetFormulaCellsMap,
        setSelectedRow,
        setSelectedCol,
        onCellEdit,
    } = useSheet();

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {

            if (cellEditMode && ["Tab"].indexOf(e.code) > -1) {
                e.stopPropagation();
                e.preventDefault();
            }
            
            if (!cellEditMode && selectedCol && selectedRow) {
                if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].indexOf(e.code) > -1) {
                    e.stopPropagation();
                    e.preventDefault();
                }
    
                if (((e.key === '=' || e.key === 'Enter' || isTermLetter(e.key) || isTermNumber(e.key)))) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.key === 'Enter' ? onCellEdit() : onCellEdit(e.key);
                } else if (e.key === 'ArrowUp') {
                    setSelectedRow(Math.max(selectedRow - 1, 1));
                } else if (e.key === 'ArrowDown') {
                    setSelectedRow(Math.min(selectedRow + 1, ROWS - 1));
                } else if (e.key === 'ArrowLeft') {
                    setSelectedCol(Math.max(selectedCol - 1, 1));
                } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
                    setSelectedCol(Math.min(selectedCol + 1, COLS - 1));
                }
            }
        }
        window.addEventListener('keydown', onKeyDown, false);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        }

    }, [selectedRow, selectedCol, cellEditMode, onCellEdit, setSelectedRow, setSelectedCol])

    const getGridItems = (): React.ReactNode => {
        const g: React.ReactNode[] = [];

        let item: React.ReactNode;

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (row === 0 && col === 0) {
                    item = <div className={'cell root'} key={row + '-' + col} />;
                    g.push(item);
                    continue;
                }

                if (row === 0) {
                    item = <ColHeader key={row + '-' + col} col={col} selected={selectedCol === col} />;
                } else if (col === 0) {
                    item = <RowHeader key={row + '-' + col} row={row} selected={selectedRow === row} />;
                } else {
                    const cellKey = convertRowColToKey(row, col);
                    const cell = sheetCellsMap.get(cellKey);

                    const hasError = cell?.hasError;
                    const selected = row === selectedRow && col === selectedCol;
                    const selectedForFormula = !selected && waitingForTerm && row === selectedCellForFormula?.row && col === selectedCellForFormula?.col;
                    const editMode = cellEditMode && selectedCol === col && selectedRow === row;
                    const partOfForumula = !selected && sheetFormulaCellsMap.has(cellKey);

                    item =
                        <Cell
                            value={cell?.value}
                            key={row + '-' + col}
                            row={row} col={col}
                            hasError={hasError}
                            selected={selected}
                            selectedForFormula={selectedForFormula}
                            editMode={editMode}
                            partOfForumula={partOfForumula}
                        />;
                }

                g.push(item);
            }
        }

        return g;
    }

    const gridStyles: CSSProperties = {
        gridTemplateColumns: '30px repeat(' + (COLS - 1) + ', 100px)',
        gridTemplateRows: 'repeat(' + ROWS + ', 25px)',
    }

    return (
        <div className="app">
            <div className="grid-contrainer" style={{ ...gridStyles }} >
                {getGridItems()}
            </div>
        </div>
    );
}

export default Sheet;