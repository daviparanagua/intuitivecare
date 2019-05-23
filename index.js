const http = require('http');
const fs = require('fs');
const pdf = require('pdf-parse');

const fileURL = 'http://www.ans.gov.br/images/stories/Plano_de_saude_e_Operadoras/tiss/Padrao_tiss/tiss3/padrao_tiss_componente_organizacional_201902.pdf';

download(fileURL, './tmp_tiss.pdf', processFile);


function processFile(file) {
    console.log('Processando arquivo...');
    let dataBuffer = fs.readFileSync(file);

    pdf(dataBuffer).then(function(data) {
        let exportedText = data.text;
        let splittedText = exportedText.split(/(?:\r\n|\r|\n)/g);
        let started = false;

        for(row of splittedText){
            if (row.match('Quadro 31')){ started = true; console.log(row); }

            if(started) {                
                if(row.match(/([0-9]+) (.+)/)) {console.log(row);}
                if (row.match('Fonte: Elaborado pelos autores.')){ break; }
            }
        }

        fs.writeFile('./file.txt', exportedText, () => {});
    });
    
}

function download(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  console.log('Obtendo arquivo...');
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
        file.close();
        cb(dest);
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest);
    if (cb) cb(err.message);
  });
};