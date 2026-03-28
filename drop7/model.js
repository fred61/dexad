'use strict'

class UpperGridModel {
    #columns
    #ballColumn
    #ball

    constructor(cols) {
        //ignore rows
        this.#columns= cols;
    }

    newBall(cheatValue, cheatLevel) {
        this.#ballColumn= Math.floor(this.#columns / 2);
        this.#ball= Ball.create(cheatValue, cheatLevel);
    }

    getCell(column) {
        if (column == this.#ballColumn) {
            return this.#ball;
        }
    }

    getBall() {
        return {column: this.#ballColumn, ball: this.#ball};
    }

    ballLeft() {
        this.#moveBall(-1);
    }

    ballRight() {
        this.#moveBall(1);
    }

    #moveBall(delta) {
        this.#ballColumn= (this.#ballColumn + this.#columns + delta) % this.#columns;
    }
}

class LowerGridModel {
    #columns;
    #rows;
    #balls;     // balls are stored in 1-d array in col-major order, rows are numbered from 0 with row 0 being the top of the grid

    constructor(rows, cols) {
        this.#rows= rows;
        this.#columns= cols;
        this.#balls= [];
        for(let i= 0; i < this.#rows; i++) {
            for(let j= 0; j < this.#columns; j++) {
                this.#balls.push(null);
            }
        }
    }

    lastEmptyRow(col) {
        const row0= col * this.#rows;
        let row= row0;
        for(; row < (col + 1) * this.#rows && this.#balls[row] === null; row++);

        return row - row0;
    }

    getCell(row, col) {
        return this.#balls[this.#indexOf(row, col)];;
    }

    dropInto(col, ball) {
        let colInd= col * this.#rows;
        console.log(`drop into ${col}, start search at ${colInd}`);
        for(; colInd < (col + 1) * this.#rows && this.#balls[colInd] === null; colInd++);
        if (colInd === col * this.#rows) {
            //TODO deal with column full
            console.log('column full');
        } else {
            this.#balls[colInd -1]= ball;
        }   
    }

    consolidate() {
        console.log("consolidating model");
        //2 passes: remove exploded balls, then evaluate rules
        for(let i= 0; i < this.#rows; i++) {
            for(let j= 0; j < this.#columns; j++) {
                const ind= this.#indexOf(i,j);
                let ball= this.#balls[ind];
                if (ball !== null) {
                    console.log(`cell ${i}/${j}: ball ${ball}`);
                    if (ball.state.explode) {
                        this.#balls[ind]= null;
                        this.#hitNeighbors(ind);
                        this.#dropBallsInColumn(j, ind);
                    }
                }
            }
        }        
        for(let i= 0; i < this.#rows; i++) {
            for(let j= 0; j < this.#columns; j++) {
                const ind= this.#indexOf(i,j);
                let ball= this.#balls[ind];
                if (ball !== null) {
                    console.log(`cell ${i}/${j}: ball ${ball}`);
                    if (this.#checkBall(i, j, ball)) {
                        ball.state.explode= true;
                    }
                }
            }
        }        

    }

    #indexOf(row, col) {
        return col * this.#rows + row;
    }

    #checkBall(row, col, ball) {
        const ind= this.#indexOf(row, col);
        const rowNeighbors= this.#rowNeighbors(ind);
        const colNeighbors= this.#colNeighbors(ind);
        return (rowNeighbors + 1) === ball.effectiveValue() || (colNeighbors + 1) === ball.effectiveValue();
    }

    #rowNeighbors(ind) {
        let count= 0;
        let nInd= ind - this.#rows
        while (nInd > 0 && this.#balls[nInd] != null) {
            count+= 1;
            nInd= nInd - this.#rows
        }

        nInd= ind + this.#rows
        while (nInd < this.#rows * this.#columns && this.#balls[nInd] != null) {
            count+= 1;
            nInd= nInd + this.#rows
        }
        return count;
    }

    #colNeighbors(ind) {
        let count= 0;
        let nInd= ind + 1
        while (nInd % this.#rows != 0 && this.#balls[nInd] !== null) {
            count+= 1;
            nInd+= 1;
        }

        nInd= ind - 1 
        while (nInd % this.#rows != 0 && this.#balls[nInd] !== null) {
            count+= 1;
            nInd-= 1;
        }

        return count;
    }

    #hitNeighbors(ind) {
        this.#hitBall(this.#upNeighbor(ind));
        this.#hitBall(this.#downNeighbor(ind));
        this.#hitBall(this.#leftNeighbor(ind));
        this.#hitBall(this.#rightNeighbor(ind));
    }

    #hitBall(ind) {
        if (ind !== undefined && this.#balls[ind] != null) {
            this.#balls[ind].hit();
        }
    }

    #upNeighbor(ind) {
        if (ind % this.#rows != 0) {
            return ind - 1;
        }
    }

    #downNeighbor(ind) {
        if (ind % this.#rows != this.#columns) {
            return ind + 1;
        }
    }

    #leftNeighbor(ind) {
        if (ind > this.#rows) {
            return ind - this.#rows;
        }
    }

    #rightNeighbor(ind) {
        if (ind / this.#rows < this.#columns) {
            return ind + this.#rows;
        }
    }

    #dropBallsInColumn(col, ind) {
        //balls[ind] === null
        for(let i= ind; i > col * this.#rows; i = i - 1) {
            this.#balls[i]= this.#balls[i - 1];
        }
    }
}

// Source - https://stackoverflow.com/q
// Posted by cypherfunc, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-04, License - CC BY-SA 4.0

const enumValue = (name) => Object.freeze({toString: () => name});

const ShellLevel = Object.freeze({
    SINGLE_SHELL: enumValue("singleShell"),
    DOUBLE_SHELL: enumValue("doubleShell"),
});

class BallState {
    shellLevel;
    explode;

    constructor(shellLevel, explode) {
        this.shellLevel= shellLevel
        this.explode= explode
    }

    toString() {
        return `shellLevel ${this.shellLevel}; explode: ${this.explode}`;
    }
}

class Ball {
    value;
    state;

    static create(cheatValue, cheatLevel) {
        let ballValue, shellState;
        if (cheatValue === undefined) {
            ballValue= Math.floor(Math.random()*7) + 1;
        } else {
            ballValue= parseInt(cheatValue);
        }
        if (cheatLevel === undefined) {
            const shellLevel= Math.floor(Math.random()*5);
            if (shellLevel < 1) {
                shellState= ShellLevel.DOUBLE_SHELL;
            } else if (shellLevel < 2) {
                shellState= ShellLevel.SINGLE_SHELL;
            }
        } else if (cheatLevel === 1) {
            shellState= ShellLevel.SINGLE_SHELL;
        } else if (cheatLevel === 2) {
            shellState= ShellLevel.DOUBLE_SHELL;
        }

        return new Ball(ballValue, new BallState(shellState, false));

    }

    constructor(value, state) {
        this.value= value;
        this.state= state; 
    }

    effectiveValue() {
        if (this.state.shellLevel === undefined) {
            return this.value;
        } else {
            return undefined;
        }
    }

    hit() {
        if (this.state.shellLevel == ShellLevel.DOUBLE_SHELL) {
            this.state.shellLevel= ShellLevel.SINGLE_SHELL;
        } else {
            this.state.shellLevel= undefined;
        }
    }

    toString() {
        return `value ${this.value}; state ${this.state}`;
    }
}

class Model {
    #upperGrid
    #lowerGrid

    constructor(rows, cols) {
        this.#upperGrid= new UpperGridModel(cols);
        this.#lowerGrid= new LowerGridModel(rows, cols);
    }

    get upper() {
        return this.#upperGrid;
    }

    get lower() {
        return this.#lowerGrid;
    }

    dropBall() {
        const ball= this.#upperGrid.getBall();
        console.log('dropping ball', ball);
        this.#lowerGrid.dropInto(ball.column, ball.ball);
    }    

    seed() {
        //let seedBallCount= Math.floor((Math.random() * 10 + 1) - 5) + 7;      // 7 +- 5
        let seedBallCount= 10;
        while (seedBallCount > 0) {
            const column= Math.floor(Math.random() * 7);
            const ball= Ball.create();
            if (ball.effectiveValue() === undefined || ball.effectiveValue() > 1) {
                seedBallCount-= 1;
                this.#lowerGrid.dropInto(column, ball);
            }
        }
    }
}