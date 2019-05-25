module.exports = function(moduleCB) {
    const http = require('http');
    const fs = require('fs');
    const pdf = require('pdf-parse');

    const fileURL = 'http://www.ans.gov.br/images/stories/Plano_de_saude_e_Operadoras/tiss/Padrao_tiss/tiss3/padrao_tiss_componente_organizacional_201902.pdf';
    const tmpPdfFilename = 'tmp_tiss.pdf';
    const tmpCsvFilename = 'tmp_tiss.csv';

    const mySQL_host = 'daviparanagua.com.br';
    const mySQL_user = 'intuitive';
    const mySQL_pass = 'LM0Zd96cpKjdwKmO';
    const mySQL_database = 'intuitive';

    const FIRST = 0, WHITE = 1, SKIPPED = 2, OK = 3;

    download(fileURL, tmpPdfFilename, processFile);

    function processFile(file) {
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
            
            fs.writeFile(tmpCsvFilename, output.map((value) => value.replace('; ', ';')).join("\n"), saveInDatabase);
            console.log(`${output.length} registros encontrados`);

            fs.unlink(tmpPdfFilename, ()=>{});
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

    function saveInDatabase(dataArray){
        var mysql = require('mysql');
        const connection = mysql.createConnection({
            host     : mySQL_host,
            user     : mySQL_user,
            password : mySQL_pass,
            database : mySQL_database,
            charset: "utf8_general_ci"
        });

        connection.connect();

        connection.query(`TRUNCATE TABLE quadro31`, function (error, results, fields) {
            if (error) throw error;

            connection.query(`LOAD DATA LOCAL INFILE ? INTO TABLE quadro31 FIELDS TERMINATED BY ';'`, [tmpCsvFilename], function (error, results, fields) {
                fs.unlink(tmpCsvFilename, ()=>{});
                if (error) throw error;
                if(moduleCB) { moduleCB(); }
            });

            connection.end();        
        });
    }
}