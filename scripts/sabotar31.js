module.exports = function(connection, moduleCB) {
    return new Promise((resolve, reject) => {
        // SCRIPT
        connection.query(`TRUNCATE TABLE quadro31`, function (error, results, fields) {
            resolve();
        });
    });
}