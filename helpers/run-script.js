const uuid = require('uuid/v4');

/**
 * Loga o início do script e o executa
 * 
 * @param {*} script 
 */
module.exports = function runScript(connection, name){
    return new Promise((resolve, reject) => {
        let pid = uuid();

        connection.query(`INSERT INTO runs (pid, script) VALUES (?, ?)`, [pid, name], function (error, results, fields) { });

        require('../scripts/' + name)(connection)
        .then( () => {
            connection.query(`UPDATE runs SET finished = CURRENT_TIMESTAMP() WHERE pid = ?`, [pid], function (error, results, fields) { });            
            resolve();
        });
    });
}