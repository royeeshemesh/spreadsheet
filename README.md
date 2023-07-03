# Spreadsheet Application POC

The goal of this application is to simulate the data model of a spreadsheet and the dependencies between cells in order to achieve the desired behavior.

The chosen approach in this application is designed to establish dependencies between cells, allowing for re-evaluation when any of their dependencies change. The flow is as follows:

1. When a cell change occurs,
2. If the cell value is a number or text, it is used as its designated value.
3. If the cell value is a formula (starts with '='), the following steps are taken:
3.1. Iterate over all formula cells and remove the edited cell from their dependents.
3.2. Iterate over each formula cell and add the edited cell to their dependents.
4. Iterate over all cell dependents and re-evaluate their values, including their dependencies.

##### A CELL type is:
```Typescript
enum SHEET_CELL_TYPE {
    Text,
    Number,
    Formula
}

type SheetCell = {
    row: number,
    col: number,
    value?: string,
    type: SHEET_CELL_TYPE,
    formula?: string,
    dependents?: string[],
    hasError?: boolean,
  }
```


#### Demo page [here](https://royeeshemesh.github.io/spreadsheet/)

---

### Disclaimer
Please note that this is not a comprehensive solution or a specific recommendation. It is a preliminary proof of concept (POC) intended to initiate benchmarking for various approaches.

The primary focus of the application is to demonstrate data relations and the required functionality. It does not prioritize performance or styling, and its user interface is intentionally kept simple and basic.

