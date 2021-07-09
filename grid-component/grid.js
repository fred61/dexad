(
    
    function() {
        'use strict'
        
        class CellGrid extends HTMLElement {
            #majorCellCount;
            #minorCellCount;
            #container;
            #adapter;
            
            constructor() {
                super();
                
                this.onfocus= (event) => console.log("focus", event);
                this.onblur= (event) => console.log("blur", event);

                this.setAttribute("tabindex", 0);
                this.addEventListener('keydown', (event) => {
                    console.log("keydown", event);
                    console.log("code", event.code);
                });
                
                this.#majorCellCount= this.getAttribute('major');
                this.#minorCellCount= this.getAttribute('minor');

                let cellStyle = document.createElement('style');
                cellStyle.textContent = `                
                    :host {
                        display: grid;
                        grid-template-rows: repeat(${this.#majorCellCount * this.#minorCellCount}, 1fr);
                        grid-template-columns: repeat(${this.#majorCellCount * this.#minorCellCount}, 1fr);
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
                    .minor-right {
                        border-right: 1px solid black;
                    }
                    .minor-bottom {
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
                    div:focus {
                        background-color: lavender;
                    }
                    :host:focus .focus {
                        border: 1px solid gold;
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
                
                this.#container= this.attachShadow({mode: 'open'});
                this.#container.appendChild(cellStyle);
                
                for(let i= 0; i < this.#majorCellCount * this.#minorCellCount; i++) {
                    for(let j= 0; j < this.#majorCellCount * this.#minorCellCount; j++) {
                        const cell= document.createElement('div');
                        cell.classList.add('cell');
                        
                        if (i == 0) {
                            cell.classList.add('top-row');
                        }
                        if (j == 0) {
                            cell.classList.add('left-col');
                        }
                        if (i > 0 && i % this.#minorCellCount == this.#minorCellCount - 1) {
                            cell.classList.add('minor-bottom');
                        }
                        if (j > 0 && j % this.#minorCellCount == this.#minorCellCount - 1) {
                            cell.classList.add('minor-right');
                        }
                        if (i == this.#majorCellCount * this.#minorCellCount - 1) {
                            cell.classList.add('bottom-row');
                        }
                        if (j == this.#majorCellCount * this.#minorCellCount - 1) {
                            cell.classList.add('right-col');
                        }
                        cell.dataset.row= i;
                        cell.dataset.col= j;
                        
                        const cellContent= document.createElement('div');
                        cellContent.classList.add('cellContent');
                        
                        cell.appendChild(cellContent);
                        
                        this.#container.appendChild(cell);
                    }
                }
                let focusCell= this.#container.firstChild.nextSibling;
                focusCell.firstChild.classList.add('focus');
                
                this.#container.addEventListener("click", (event) => {
                    let currentFocusCell= this.#container.querySelector('div.cellContent.focus');
                    if (currentFocusCell !== null) {
                        currentFocusCell.classList.remove('focus');
                    }
                    let targetCell= event.target;
                    while (!targetCell.classList.contains('cellContent')) {
                        targetCell= targetCell.parent;
                    }
                    //TODO safety net for no cell found
                    targetCell.classList.add('focus');
                });
            }
            

            set adapter(adapter) {
                // console.log("attaching model", model);
                this.#adapter= adapter;
                adapter.addListener(this);
                // console.log("model set", this);
                this.repaint();
            }
            
            onChange() {
                repaint();
            }
            
            repaint() {
                // console.log("container", Array.from(this.container.children).filter((element) => element.matches("div.cell")));
                Array.from(this.#container.children).filter((element) => element.matches("div.cell")).forEach((cell) => {
                    this.#adapter.renderCell(cell.dataset.row, cell.dataset.col, cell.firstChild);
                });
            }
        }

        customElements.define('cell-grid', CellGrid);
    }
)();

