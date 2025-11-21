const { PdfReader } = require('pdfreader');
new PdfReader().parseFileItems('doc_soporte.pdf', (err, item) => {
  if (err) return console.error('error:', err);
  if (!item) return;
  if (item.text) console.log(item.text);
});
