import fs from 'fs';
import pdf from 'pdf-parse';
const dataBuffer = fs.readFileSync('Documento soporte Prueba tÃ©cnica L2.pdf');
pdf(dataBuffer).then(data => {
  console.log(data.text);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
