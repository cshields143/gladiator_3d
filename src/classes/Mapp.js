const MishapenError = class extends Error {
  constructor(rows) {
    super(rows.map(r => r.length).join(','));
    Error.captureStackTrace(this, MishapenError);
  }
};
const OutOfBoundsError = class extends Error {
  constructor(x, y) {
    super(`(${x},${y})`);
    Error.captureStackTrace(this, OutOfBoundsError);
  }
};
const all_same_length = (...arrs) => arrs.every((x, i, c) => x.length === c[0].length);
const Mapp = class {
  constructor(...rows) {
    this.rows = [];
    if (!all_same_length(rows))
      throw new MishapenError(rows);
    rows.forEach(row => {
      this.rows.push([]);
      const i = this.rows[this.rows.length - 1];
      row.forEach(wallType => {
        this.rows[i].push(Math.trunc(wallType));
      })
    });
    this.width = this.rows[0].length;
    this.height = this.rows.length;
  }
  fetch(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
      throw new OutOfBoundsError(x, y);
    return this.rows[y][x];
  }
};

export { Mapp };