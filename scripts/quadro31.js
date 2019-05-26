module.exports = function(connection, moduleCB) {
    return new Promise((resolve, reject) => {
        const fs = require('fs');
        const pdf = require('pdf-parse');

        const download = require('../helpers/download');

        const fileURL = 'http://www.ans.gov.br/images/stories/Plano_de_saude_e_Operadoras/tiss/Padrao_tiss/tiss3/padrao_tiss_componente_organizacional_201902.pdf';
        const tmpPdfFilename = 'tmp_tiss.pdf';
        const tmpCsvFilename = 'tmp_tiss.csv';

        const FIRST = 0, WHITE = 1, SKIPPED = 2, OK = 3;

        // SCRIPT
        return download(fileURL, tmpPdfFilename)
        .then(parseFile)
        .then((file) => saveInDatabase(file, 'quadro31'))
        .then(resolve);

        /**
         * Parses a file, extracting relevant data from PDF downloaded
         * 
         * @param {*} file 
         */
        function parseFile(file) {
            return new Promise((resolve, reject) => {
                console.log('Processando arquivo...');
                let dataBuffer = fs.readFileSync(file);

                pdf(dataBuffer).then(function(data) {
                    let exportedText = data.text;
                    let splittedText = exportedText.split(/(?:\r\n|\r|\n)/g);
                    let started = false;
                    let output = [];

                    let lastStatus = FIRST;

                    let startString = /Quadro 31/;
                    let endString = /Fonte: Elaborado pelos autores./;

                    for(rowIndex in splittedText){
                        let row = splittedText[rowIndex];

                        // Localizar fator de início de transcrição
                        if (row.match(startString)){ started = true;}

                        // Apenas após iniciar a transcrição
                        else if(started) {

                            // Linha de encerramento
                            if (endString.test(row)){ break; }

                            // Linha em branco - sinalizador de quebra de página iminente
                            if (/^\s+$/.test(row)) { lastStatus = WHITE;}

                            // Linha anterior em branco. Irrelevante.
                            else if (lastStatus == WHITE) {lastStatus = SKIPPED; continue;}

                            // Linha completa. OK
                            else if(/^([0-9]+) (.*)/.test(row) ) {
                                matched = row.match(/^([0-9]+) (.*)/);
                                output.push(`${matched[1]};${matched[2].trim()}`);
                                lastStatus = OK;
                            }

                            // Linha residual do registro anterior
                            else if(/(.+)/.test(row) && lastStatus === OK) {
                                output[output.length - 1] = output[output.length - 1] + ' ' + row.trim();
                            }
                        }
                    }
                    
                    console.log(`${output.length} registros encontrados`);
                    fs.writeFile(tmpCsvFilename, output.map((value) => value.replace('; ', ';')).join("\n"), () => resolve(tmpCsvFilename) );
                    fs.unlink(tmpPdfFilename, ()=>{});
                });
            });
        }

        /**
         * Loads the csv to the remote table
         * @param {*} tmpCsvFilename 
         */
        function saveInDatabase(filename, table){
            console.log(`Carregando ${filename} em ${table}`);

            return new Promise((resolve, reject) => {
                connection.query(`TRUNCATE TABLE ${table}`, function (error, results, fields) {
                    if (error) throw error;

                    connection.query(`LOAD DATA LOCAL INFILE ? INTO TABLE ${table} FIELDS TERMINATED BY ';'`, [filename, table], function (error, results, fields) {
                        fs.unlink(tmpCsvFilename, ()=>{});
                        if (error) throw error;
                        resolve();
                    });

                    resolve();
                });
            });
        }
    });
}