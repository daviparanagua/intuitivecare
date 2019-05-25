const http = require('http');
const fs = require('fs');
const pdf = require('pdf-parse');

const fileURL = 'http://www.ans.gov.br/images/stories/Plano_de_saude_e_Operadoras/tiss/Padrao_tiss/tiss3/padrao_tiss_componente_organizacional_201902.pdf';

const FIRST = 0, WHITE = 1, SKIPPED = 2, OK = 3;

download(fileURL, './tmp_tiss.pdf', processFile);


function processFile(file) {
    console.log('Processando arquivo...');
    let dataBuffer = fs.readFileSync(file);

    pdf(dataBuffer).then(function(data) {
        let exportedText = data.text;
        let splittedText = exportedText.split(/(?:\r\n|\r|\n)/g);
        let started = false;
        let output = [];

        let lastStatus = FIRST;

        let startString = 'Quadro 31';
        let endString = 'Fonte: Elaborado pelos autores.';

        for(rowIndex in splittedText){
            let row = splittedText[rowIndex];

            // Localizar fator de início de transcrição
            if (row.match(startString)){ started = true; console.log(row); }

            // Apenas após iniciar a transcrição
            else if(started) {

                // Linha de encerramento
                if (row.match(endString)){ console.log(endString); break;  }

                // Linha em branco - sinalizador de quebra de página iminente
                if (row.match(/^\s+$/)) { lastStatus = WHITE; console.log(row);}

                // Linha anterior em branco. Irrelevante.
                else if (lastStatus == WHITE) {lastStatus = SKIPPED; continue;}

                // Linha completa. OK
                else if(row.match(/^([0-9]+) (.*)/)) {
                    output.push(row);
                    lastStatus = OK;
                }

                // Linha residual do registro anterior
                else if(row.match(/(.+)/) && lastStatus === OK) {
                    output[output.length - 1] = output[output.length - 1] + ' ' + row;
                }
            }
        }

        fs.writeFile('./file.txt', exportedText, () => {});
        fs.writeFile('./finalFile.txt', output.join("\r\n"), () => {});
        console.log(`${output.length} registros encontrados`);        
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