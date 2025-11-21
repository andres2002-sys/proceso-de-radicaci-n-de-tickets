const fs = require('fs');
const { PdfReader } = require('pdfreader');
const rows = {};
new PdfReader().parseFileItems('doc_soporte.pdf', (err, item) => {
  if (err) {
    console.error(err);
  } else if (!item) {
    const lines = Object.keys(rows)
      .sort((y1, y2) => parseFloat(y1) - parseFloat(y2))
      .map(y => rows[y].join(' '));
    console.log(lines.join('\n'));
  } else if (item.text) {
    const row = rows[item.y] || [];
    row.push(item.text);
    rows[item.y] = row;
  }
});
