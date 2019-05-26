const fs = require('fs');
const http = require('http');

/**
 * Download a file and save it to dest
 * @param {*} url File to be downloaded
 * @param {*} dest Local path to save file
 */
module.exports = function download(url, dest) {
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