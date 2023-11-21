import dat from "dat.gui"; 
import "./reset.css";
import "./style.css";

const previous_opts = JSON.parse(window.localStorage.getItem("gui_options"));
const default_opts = {
  grid_square_size: 20, 
  num_columns: 25, 
  num_rows: 12, 
  num_walkers: 30,
  padding: 10,
  walker_start_size: 0.7,
  walker_separation: 0,
  walker_center_separation: 4,
  walker_age: 500,
  show_grid: true,
  grid_color: "#222",
  background_color: "#111", 
  walker_dot_color: "#EEE",
  walker_line_color: "#EEE",
  walker_line_width: 1, 
  allow_cross_paths: true,
  allow_path_ends_merge: true,
  center_attraction: 1,
}

// Merge previous with default
let opts = {...default_opts, ...previous_opts};

const gui = new dat.GUI();
const grid = gui.addFolder("Grid");
const visual = gui.addFolder("Visual");
const walkers = gui.addFolder("Walkers");
const controls = gui.addFolder("Controls");
grid.open();
visual.open();
walkers.open();
grid.add(opts, "grid_square_size", 1, 100, 1).onChange(onGuiChange).name("Grid Square Size");
grid.add(opts, "num_columns", 1, 100, 1).onChange(onGuiChange).name("Num Columns");
grid.add(opts, "num_rows", 1, 100, 1).onChange(onGuiChange).name("Num Rows");
visual.add(opts, "show_grid", true, false).onChange(onGuiChange).name("Show Grid");
visual.addColor(opts, "grid_color").onChange(onGuiChange).name("Grid Color");
visual.addColor(opts, "background_color").onChange(onGuiChange).name("Background Color");
visual.addColor(opts, "walker_dot_color").onChange(onGuiChange).name("Walker Dot Color");
visual.addColor(opts, "walker_line_color", 1, 400, 1).onChange(onGuiChange).name("Walker Line Color");
visual.add(opts, "walker_line_width", 0.1, 10, 0.1).onChange(onGuiChange).name("Walker Line Width");
walkers.add(opts, "num_walkers", 1, 400, 1).onChange(onGuiChange).name("Num Walkers");
walkers.add(opts, "walker_start_size", 0, 3, 0.1).onChange(onGuiChange).name("Walker Start Size");
walkers.add(opts, "walker_separation", 0, 10, 1).onChange(onGuiChange).name("Walker Separation");
walkers.add(opts, "walker_age", 1, 500).onChange(onGuiChange).name("Walker Age");
walkers.add(opts, "allow_cross_paths", true, false).onChange(onGuiChange).name("Paths Can Cross");
walkers.add(opts, "allow_path_ends_merge", true, false).onChange(onGuiChange).name("Path Can Merge");
walkers.add(opts, "center_attraction", 0, 1, 0.1).onChange(onGuiChange).name("Center Attraction");
controls.add({ reset }, "reset").name("Reset");
gui.add({ update }, "update").name("Update");
gui.add({ capture }, "capture").name("Capture");

function onGuiChange() {
  window.localStorage.setItem("gui_options", JSON.stringify(opts));
}

function reset() {
  window.localStorage.removeItem("gui_options");
  location.reload();
}

onGuiChange();

const canvas = document.getElementById("canvas");
let ctx; 

const myWorker = new Worker(new URL('./worker.js', import.meta.url));
update();

/**
 * 
 */
myWorker.onmessage = async function(e) {
  const walker_row_col_arrays = e.data;

  class RowCol {
    constructor({row, column}) {
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
  }

  ctx.fillStyle = opts.background_color;
  ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

  // Draw Grid
  if(opts.show_grid) {
    ctx.strokeStyle = opts.grid_color;
    ctx.strokeWidth = "1px";
    for (let c = 0; c < opts.num_columns; c++) {
      for (let r = 0; r < opts.num_rows; r++) {
        const row_col = new RowCol({ row: r, column: c });
        ctx.strokeRect(row_col.x, row_col.y, opts.grid_square_size, opts.grid_square_size);
      }
    }
  }
  
  // Draw
  ctx.fillStyle = opts.walker_dot_color;
  ctx.strokeStyle = opts.walker_line_color;
  ctx.lineWidth = opts.walker_line_width;

  const walker_base_start_size = opts.grid_square_size / 2;
  const step_delay = 0.5; 
  let calls = []; 

  for(let walker_i = 0; walker_i < walker_row_col_arrays.length; walker_i++) {
    const row_col_array = walker_row_col_arrays[walker_i];
    let prev_array = false;
    if(walker_i > 0) {
      prev_array = walker_row_col_arrays[walker_i - 1];
    }
    
    // setTimeout(() => {
    for(let step_i = 0; step_i < row_col_array.length; step_i++) {
      // await new Promise(resolve => {
        // setTimeout(() => {
          const step_values = row_col_array[step_i];
          const step = new RowCol({row: step_values[0], column: step_values[1]}); 
          if(step_i === 0) {
            calls.push(
              () => ctx.beginPath(),
              () => ctx.arc(
                step.centerX,
                step.centerY,
                walker_base_start_size * opts.walker_start_size,
                0,
                2 * Math.PI
              ),
              () => ctx.fill(),
              () => ctx.beginPath()
            )
            // ctx.beginPath();
            // ctx.arc(
            //   step.centerX,
            //   step.centerY,
            //   walker_base_start_size * opts.walker_start_size,
            //   0,
            //   2 * Math.PI
            // );
            // ctx.fill();
            // ctx.beginPath();
          }
          else {
            const prev_step_values = row_col_array[step_i - 1];
            const prev_step = new RowCol({row: prev_step_values[0], column: prev_step_values[1]}); 
    
            if(step_i === 1) {
              calls.push(
                () => ctx.moveTo(prev_step.centerX, prev_step.centerY)
              )
            }
            else {
              // ctx.lineTo(prev_step.centerX, prev_step.centerY);
              calls.push(
                () => ctx.lineTo(prev_step.centerX, prev_step.centerY)
              )
            }
          }
          // ctx.stroke();
          calls.push(() => ctx.stroke())

          // resolve();
        // }, step_i * step_delay)
      // })
    }
    // }, prev_array && prev_array.length * step_delay)

    const anim_promise = Promise; 
    let starttime = performance.now();
    const interval = 20; 

    function tick(timestamp) {
      if(calls.length) window.requestAnimationFrame(tick);
      else anim_promise.resolve(); 

      const elapsed = timestamp - starttime;
      if(elapsed > interval) {
        starttime = performance.now();
        const call = calls.shift();
        call && call(); 
      }
    }

    tick();
    await anim_promise;
  }
}

function update() {
  // Run worker
  myWorker.postMessage(opts);

  // Update canvas
  const dpr = window.devicePixelRatio;
  const width = opts.num_columns * opts.grid_square_size;
  const height = opts.num_rows * opts.grid_square_size;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
}

const hash = Math.round(Math.random() * 1000) + ''; 
let image_index = 0; 

function capture() {
  image_index++;
  var link = document.createElement('a');
  link.download = `walker_${hash}_${image_index}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 1.0);
  link.click();
}