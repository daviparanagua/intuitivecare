const uuid = require('uuid/v4');
const connection = require('./database');

console.log(connection);

/**
 * Loga o início do script e o executa
 * 
 * @param {*} script 
 */
module.exports = function runScript(name, script){
    let pid = uuid();

    connection.query(`INSERT INTO runs (pid, script) VALUES (?, ?)`, [pid, name], function (error, results, fields) { });

    script()
    .then( () => {
        connection.query(`UPDATE runs SET finished = CURRENT_TIMESTAMP() WHERE pid = ?`, [pid], function (error, results, fields) { });
        connection.end();
    });
}