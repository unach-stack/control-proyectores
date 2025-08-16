const fs = require('fs');

const resetData = {
  documents: []
};

fs.writeFile('./db.json', JSON.stringify(resetData, null, 2), (err) => {
  if (err) {
    console.error('Error al escribir el archivo:', err);
  } else {
    console.log('db.json ha sido reseteado correctamente.');
  }
});
