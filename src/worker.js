
let opts;

onmessage = function(e) {
  opts = e.data; 
  let walkers = runWalkers();
  const walker_row_col_arrays = walkers.map(walker => {
    return walker.row_col_steps.map(row_col => {
      return [row_col.row, row_col.column];
    })
  })
  postMessage(walker_row_col_arrays);
}

function runWalkers() {
  let center = { row: opts.num_rows / 2, column: opts.num_columns / 2 };
  let grid_squares = {};
  let walkers = [];

  /**
   *
   */
  class RowCol {
    constructor({ row, column }) {
      // bindings
      this.taxiDist = this.taxiDist.bind(this);
  
      // vars
      this.row = row;
      this.column = column;
    }
  
    get toXY() {
      return { x: this.column * opts.grid_square_size, y: this.row * opts.grid_square_size };
    }
  
    get x() {
      return this.toXY.x;
    }
  
    get y() {
      return this.toXY.y;
    }
  
    get centerX() {
      return this.toXY.x + opts.grid_square_size / 2;
    }
  
    get centerY() {
      return this.toXY.y + opts.grid_square_size / 2;
    }
  
    get isInBounds() {
      return (
        this.row > 0 &&
        this.row < (opts.num_rows - 1) &&
        this.column > 0 &&
        this.column < (opts.num_columns - 1)
      );
    }
  
    get gridSquareValue() {
      return grid_squares["" + this.column + "|" + this.row];
    }
  
    static getGridSquareValue({ row, column }) {
      return grid_squares["" + column + "|" + row];
    }
  
    crossesPath(other_row_col) {
      // 1. Check if square is diagonal
      if (other_row_col.row === this.row || other_row_col.column === this.column)
        return false;
      // 2. Check diagonals
      const diagonal_one = { row: other_row_col.row, column: this.column };
      const diagonal_two = { row: this.row, column: other_row_col.column };
      return (
        RowCol.getGridSquareValue(diagonal_one) ||
        RowCol.getGridSquareValue(diagonal_two)
      );
    }
  
    setGridSquare(value) {
      grid_squares["" + this.column + "|" + this.row] = value;
    }
  
    equals(other_row_col) {
      return (
        this.row === other_row_col.row && this.column === other_row_col.column
      );
    }
  
    taxiDist(other_row_col) {
      return (
        Math.abs(other_row_col.column - this.column) +
        Math.abs(other_row_col.row - this.row)
      );
    }
  }

  class Walker {
    constructor({ row, column }) {
      // bindings
      this.update = this.update.bind(this);
  
      // vars
      this.start_row_col = new RowCol({ row, column });
      this.row_col = this.start_row_col;
      grid_squares["" + column + "|" + row] = "WS";
      this.at_start = true;
      this.age = opts.walker_age;
      this.row_col_steps = [this.start_row_col];
    }
  
    update() {
      this.at_start = false;
      this.prev_row_col = this.row_col;
      this.row_col = undefined;
  
      let adjacent_row_cols = [];
      let next_row_col;
      const r_lower_bound = this.prev_row_col.row === 0 ? 0 : -1;
      const r_upper_bound = this.prev_row_col.row === opts.num_rows - 1 ? 0 : 1;
      const c_lower_bound = this.prev_row_col.column === 0 ? 0 : -1;
      const c_upper_bound = this.prev_row_col.column === opts.num_columns - 1 ? 0 : 1;
  
      for (let r = r_lower_bound; r <= r_upper_bound; r++) {
        for (let c = c_lower_bound; c <= c_upper_bound; c++) {
          if(!(r == 0 && c == 0)) {
            adjacent_row_cols.push(
              new RowCol({
                row: this.prev_row_col.row + r,
                column: this.prev_row_col.column + c
              })
            );
          }; 
        }
      }
  
      let possible_next_row_cols = adjacent_row_cols.filter((row_col) => {
        return (
          !row_col.gridSquareValue &&
          (opts.allow_cross_paths || !this.prev_row_col.crossesPath(row_col))
        );
      });
  
      if (possible_next_row_cols.length) {
        let random = Math.random();
  
        if (random < opts.center_attraction) {
          const possible_next_row_cols_by_dist_to_center =
            possible_next_row_cols.sort(
              (a, b) => a.taxiDist(center) - b.taxiDist(center)
            );
          next_row_col = possible_next_row_cols_by_dist_to_center[0];
        } else {
          next_row_col = possible_next_row_cols[Math.floor(Math.random() * possible_next_row_cols.length)];
        }
      }
      else if (opts.allow_path_ends_merge) {
        next_row_col = adjacent_row_cols.find(row_col => row_col.gridSquareValue === 'E');
      }
  
      if (next_row_col) {
        this.prev_row_col.setGridSquare("P");
        this.row_col = next_row_col;
        this.row_col.setGridSquare("E");

        // Log next step
        this.row_col_steps.push(this.row_col); 
      }
  
      this.age -= 1;
  
      if (this.age === 0 || !this.row_col) {
        this.dead = true;
      }
    }
  }
  
  /**
   *
   */
  function ranRowCol(params = {}) {
    const {rows, columns} = params;
    const row = Math.round(Math.random() * (columns || opts.num_rows - 1));
    const column = Math.round(Math.random() * (rows || opts.num_columns - 1));
    return new RowCol({ row, column });
  }

  // Initial positions
  for (let i = 0; i < opts.num_walkers; i++) {
    let start_row_col = ranRowCol();
    const walkers_row_cols = walkers.map((walker) => walker.start_row_col);
    let rowColIsValid = (row_col) => {
      return (
        row_col &&
        row_col.taxiDist(center) > opts.walker_center_separation &&
        !walkers_row_cols.find(
          (other_row_col) =>
            row_col.taxiDist(other_row_col) < opts.walker_separation
        )
      );
    };

    let index = 0; 
    while (!rowColIsValid(start_row_col) && index < 10) {
      index++;
      start_row_col = ranRowCol();
    }

    if(index < 10) {
      const walker = new Walker({
        row: start_row_col.row,
        column: start_row_col.column
      });
      walkers.push(walker);
    }
  }

  // Calculate each ste
  let index = 0;
  let living_walkers = walkers; 

  while (walkers.length && index < 1000) {
    index++;

    living_walkers.forEach((walker) => {
      walker.update();
    });
  
    living_walkers = living_walkers.filter((walker) => !walker.dead);
  }

  return walkers;
}