import React, { useEffect } from "react";
import { useSheet } from "../context/context";

type CellProps = {
    row: number,
    col: number,
    value?: string,
    selected?: boolean,
    selectedForFormula?: boolean,
    editMode?: boolean,
    partOfForumula?: boolean,
    hasError?: boolean,
}

const Cell: React.FC<CellProps> = ({
    row,
    col,
    value,
    hasError,
    selected,
    selectedForFormula,
    editMode,
    partOfForumula,
}) => {
    const cellRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const {
        onSelect,
        onCellEdit,
        cellEditValue,
        onCellEditValueChange,
        waitingForTerm,
        onCellEditValueKeyup,
    } = useSheet();

    const handleEditValueChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        onCellEditValueChange(event.currentTarget.value);
    }

    const handleOnClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        onSelect(row, col);
    }

    const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        if (waitingForTerm) {
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        onCellEdit();
    }

    useEffect(() => {
        if (editMode) {
            inputRef.current?.focus();
        }
    }, [editMode, inputRef, cellEditValue]);

    useEffect(() => {
        if (selected) {
            cellRef.current?.scrollIntoView({ block: 'end', inline: 'end' });
        }
    }, [selected]);

    const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        onCellEditValueKeyup(event);
    }

    if (editMode) {
        return (
            <div className={
                'cell' +
                (selected ? ' selected ' : '') +
                (editMode ? ' edit ' : '')
            } onClick={handleOnClick} onDoubleClickCapture={handleDoubleClick}>
                <input ref={inputRef} autoFocus type="text" onKeyDownCapture={handleKeyUp} value={cellEditValue} onChange={handleEditValueChange} />
            </div>
        );
    }

    return (
        <div
            ref={cellRef}
            className={
                'cell ' +
                (selected ? 'selected' : '') +
                (selectedForFormula ? ' selected-formula ' : '') +
                (partOfForumula ? ' formula ' : '') +
                (hasError ? ' error ' : '')
            }
            onClick={handleOnClick}
            onDoubleClick={handleDoubleClick}>
            {value}
        </div>
    );
}

export default Cell;