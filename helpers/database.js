const mysql = require('mysql');

let pool = {};

exports.connect = function (host, user, pass, database) {    

    if (host) {
        pool = mysql.createPool({
            connectionLimit : 10,
            host     : host,
            user     : user,
            password : pass,
            database : database,
            charset: "utf8_general_ci"
        });
    }

    return pool;
}

exports.pool = pool;