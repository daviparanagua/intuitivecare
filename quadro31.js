module.exports = function(moduleCB) {
    const http = require('http');
    const fs = require('fs');
    const pdf = require('pdf-parse');
    const uuid = require('uuid/v4');

    const fileURL = 'http://www.ans.gov.br/images/stories/Plano_de_saude_e_Operadoras/tiss/Padrao_tiss/tiss3/padrao_tiss_componente_organizacional_201902.pdf';
    const tmpPdfFilename = 'tmp_tiss.pdf';
    const tmpCsvFilename = 'tmp_tiss.csv';

    const mySQL_host = 'daviparanagua.com.br';
    const mySQL_user = 'intuitive';
    const mySQL_pass = 'LM0Zd96cpKjdwKmO';
    const mySQL_database = 'intuitive';

    const FIRST = 0, WHITE = 1, SKIPPED = 2, OK = 3;

    // CONEXÃO

    var mysql = require('mysql');
    const connection = mysql.createConnection({
        host     : mySQL_host,
        user     : mySQL_user,
        password : mySQL_pass,
        database : mySQL_database,
        charset: "utf8_general_ci"
    });

    connection.connect();

    // SCRIPT

    runScript('quadro31', () => { 
        return download(fileURL, tmpPdfFilename)
        .then(parseFile)
        .then((file) => saveInDatabase(file, 'quadro31'));
    });

    // FUNÇÕES

    /**
     * Loga o início do script e o executa
     * 
     * @param {*} script 
     */
    function runScript(name, script){
        let pid = uuid();

        connection.query(`INSERT INTO runs (pid, script) VALUES (?, ?)`, [pid, name], function (error, results, fields) { });

        script()
        .then( () => {
            connection.query(`UPDATE runs SET finished = CURRENT_TIMESTAMP() WHERE pid = ?`, [pid], function (error, results, fields) { });
            connection.end();
        });
    }

    /**
     * Loga o início do script e o executa
     * 
     * @param {*} script 
     */
    function logStep(pid, message){
        connection.query(`INSERT INTO log (pid, message) VALUES (?, ?)`, [pid, message], function (error, results, fields) { });
    }

    /**
     * Download a file and save it to dest
     * @param {*} url File to be downloaded
     * @param {*} dest Local path to save file
     */
    function download(url, dest) {
        return new Promise ((resolve, reject) => {
            var file = fs.createWriteStream(dest);
            console.log('Obtendo arquivo...');
            http.get(url, function(response) {
                response.pipe(file);
                file.on('finish', function() {
                    file.close( () => resolve(dest) );
                });
            }).on('error', function(err) { // Handle errors
                fs.unlink(dest);                
                reject(false);
            });
        });
    };

    /**
     * Parses a file, extracting relevant data from PDF downloaded
     * 
     * @param {*} file 
     */
    function parseFile(file) {
        return new Promise((resolve, reject) => {
            logStep('Processando arquivo...');
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
                    if(moduleCB) { moduleCB(); }
                });

                resolve();
            });
        });
    }
}