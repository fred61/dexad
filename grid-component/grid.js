(

    function () {
        'use strict'

        class CellGrid extends HTMLElement {
            #majorRowCells; #minorRowCells;
            #majorColCells; #minorColCells;
            #geometryChanged;
            #cellContainer;
            #cellStyle;
            #adapter;

            constructor() {
                super();
            }

            connectedCallback() {
                if (this.hasAttribute('major')) {
                    this.#majorRowCells= this.getAttribute('major');
                    this.#majorColCells= this.#majorRowCells;
                }

                if (this.hasAttribute('minor')) {
                    this.#minorRowCells = this.getAttribute('minor');
                    this.#minorColCells= this.#minorRowCells
                }

                if (this.hasAttribute('majorRows')) {
                    this.#majorRowCells= this.getAttribute('majorRows');
                    if (this.hasAttribute('minorRows')) {
                        this.#minorRowCells= this.getAttribute('minorRows');
                    } else {
                        this.#minorRowCells= 1;
                    }
                }
                
                if (this.hasAttribute('majorCols')) {
                    this.#majorColCells= this.getAttribute('majorCols');
                    if (this.hasAttribute('minorCols')) {
                        this.#minorColCells= this.getAttribute('minorCols');
                    } else {
                        this.#minorColCells= 1;
                    }
                }

                this.#majorColCells= parseInt(this.#majorColCells) || 1;
                this.#majorRowCells= parseInt(this.#majorRowCells) || 1;
                this.#minorColCells= parseInt(this.#minorColCells) || 1;
                this.#minorRowCells= parseInt(this.#minorRowCells) || 1;

                const container = this.attachShadow({ mode: 'open' });
                this.#cellStyle= document.createElement('style');
                this.#cellStyle.textContent= this.#cellStyleText();
                container.appendChild(this.#cellStyle);

                this.#cellContainer = document.createElement('div');
                container.appendChild(this.#cellContainer);

                this.#createCells();

                if (this.getAttribute('tabindex') != null) {
                    this.enableFocus();
                }
            }

            #cellStyleText() {
                return `  
                    :host {
                        display: grid;
                    }              
                    :host>div {
                        display: grid;
                        grid-template-rows: repeat(${this.#majorRowCells * this.#minorRowCells}, 1fr);
                        grid-template-columns: repeat(${this.#majorColCells * this.#minorColCells}, 1fr);
                    }
                    .cell {
                        border-right: 1px dashed silver;
                        border-bottom: 1px dashed silver;
                        padding: 1px;
                        display: flex;
                    }
                    .top-row {
                        border-top: 2px solid black;
                    }
                    .left-col {
                        border-left: 2px solid black;
                    }
                    .major-right {
                        border-right: 1px solid black;
                    }
                    .major-bottom {
                        border-bottom: 1px solid black;
                    }
                    .right-col {
                        border-right: 2px solid black;
                    }
                    .bottom-row {
                        border-bottom: 2px solid black;
                    }
                    .cellContent {
                        border: none;
                        flex-grow: 1;
                    }
                    :host(:focus) .cellContent.focus {
                        border: 1px solid red;
                    }
                `;

                //this is not the final word. grid doesn't do border collapse
                // one alternative approach is grid-gap and have background of container be border color
                // would need to restructure, can't have 1 grid, would need separate major / minor grids
                // cannot do any border style other than solid this way, either
                // I can do my own "border collapse" by being careful which borders are defined.
                // can't use outline for visualising focus under these circumstances though, have to use border.
                // have to be careful with priority. focus has prio over normal cell borders.
                // not gonna work because of "collapse". left border of cell is actually right border of previous cell.
            }

            #createCells() {
                for (let i = 0; i < this.#majorRowCells * this.#minorRowCells; i++) {
                    for (let j = 0; j < this.#majorColCells * this.#minorColCells; j++) {
                        const cell = document.createElement('div');
                        cell.classList.add('cell');

                        if (i == 0) {
                            cell.classList.add('top-row');
                        }
                        if (j == 0) {
                            cell.classList.add('left-col');
                        }
                        if (i % this.#minorRowCells == this.#minorRowCells - 1) {
                            cell.classList.add('major-bottom');
                        }
                        if (j % this.#minorColCells == this.#minorColCells - 1) {
                            cell.classList.add('major-right');
                        }
                        if (i == this.#majorRowCells * this.#minorRowCells - 1) {
                            cell.classList.add('bottom-row');
                        }
                        if (j == this.#majorColCells * this.#minorColCells - 1) {
                            cell.classList.add('right-col');
                        }

                        const cellContent = document.createElement('div');
                        cellContent.dataset.row = i;
                        cellContent.dataset.col = j;
                        cellContent.classList.add('cellContent');

                        cell.appendChild(cellContent);

                        this.#cellContainer.appendChild(cell);
                    }
                }
                this.#geometryChanged= false;
            }

            enableFocus() {
                //click handler must be registered inside shadow dom or event target props are not useful
                this.#cellContainer.addEventListener('click', (event) => {
                    const currentFocusCell = this.#cellContainer.querySelector('div.cellContent.focus');
                    if (currentFocusCell !== null) {
                        currentFocusCell.classList.remove('focus');
                    }
                    let targetCell = event.target;
                    while (targetCell != undefined && !targetCell.classList.contains('cellContent')) {
                        targetCell = targetCell.parent;
                    }
                    if (targetCell == undefined) {
                        // click event on parent of cellContent
                        targetCell= event.target.querySelector('div.cellContent');
                    }
                    if (targetCell == null) {
                        console.log('did not find cell content for click event', event.target);
                    } else {
                        targetCell.classList.add('focus');
                    }

                });

                this.addEventListener('keydown', (event) => {
                    switch (event.key) {
                        case "ArrowUp":
                            this.moveFocus(-1, 0);
                            break;
                        case "ArrowDown":
                            this.moveFocus(1, 0);
                            break;
                        case "ArrowLeft": 
                            this.moveFocus(0, -1);
                            break;
                        case "ArrowRight":
                            this.moveFocus(0, 1);
                            break;
                        default:
                            this.updateModel(event.key);
                    }
                })
            }

            moveFocus(deltaRow, deltaCol) {
                const currentFocusCell = this.#cellContainer.querySelector('div.cellContent.focus');
                if (currentFocusCell == null) {
                } else {
                    currentFocusCell.classList.remove('focus');
                    const row= parseInt(currentFocusCell.dataset.row) + deltaRow
                    const col= parseInt(currentFocusCell.dataset.col) + deltaCol

                    const newFocusCell= this.#cellContainer.querySelector(`div[data-row="${row}"][data-col="${col}"]`)
                    if (newFocusCell == null) {
                        console.log("could not find new focus cell")
                    } else {
                        newFocusCell.classList.add('focus');
                    }
                }
            }

            updateModel(key) {
                if ("update" in this.#adapter) {
                    const currentFocusCell = this.#cellContainer.querySelector('div.cellContent.focus');
                    const row= parseInt(currentFocusCell.dataset.row);
                    const col= parseInt(currentFocusCell.dataset.col);
                    this.#adapter.update(row, col, key);
                }
            }


            set adapter(adapter) {
                this.#adapter = adapter;
                adapter.addListener(this);
                this.repaint();
            }

            get columns() {
                return this.#majorColCells * this.#minorColCells
            }

            get rows() {
                return this.#majorRowCells * this.#minorRowCells
            }

            get majorColumns() {
                return this.#majorColCells
            }

            set majorColumns(cols) {
                this.#majorColCells= cols;
                this.#geometryChanged= true;
            }

            get minorColumns() {
                return this.#minorColCells
            }

            set minorColumns(cols) {
                this.#minorColCells= cols;
                this.#geometryChanged= true;
            }

            get majorRows() {
                return this.#majorRowCells
            }

            set majorRows(cols) {
                this.#majorRowCells= cols;
                this.#geometryChanged= true;
            }
            
            get minorRows() {
                return this.#minorRowCells
            }

            set minorRows(cols) {
                this.#minorRowCells= cols;
                this.#geometryChanged= true;
            }

            onChange() {
                repaint();
            }

            repaint() {
                if (this.#geometryChanged) {
                    while (this.#cellContainer.firstChild) {
                        this.#cellContainer.removeChild(this.#cellContainer.firstChild);
                    }
                    this.#cellStyle.textContent= this.#cellStyleText();
                    this.#createCells();
                }
                if (this.#adapter !== undefined) {
                    this.#cellContainer.querySelectorAll("div.cellContent").forEach((cell) => {
                        const rowInd= parseInt(cell.dataset.row);
                        const colInd= parseInt(cell.dataset.col);
                        this.#adapter.renderCell(rowInd, colInd, cell);
                    });
                }
            }

        }

        customElements.define('cell-grid', CellGrid);
    }
)();

