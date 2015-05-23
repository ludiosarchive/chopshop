"use strict";

const chunk = require('.').chunk;
const fs = require('fs');
const co = require('co');

co(function*() {
	for(let chunkStream of chunk(fs.createReadStream('/etc/passwd'), 100)) {
		chunkStream.on('data', function(data) {
			process.stdout.write(data);
			console.log("\n" + data.length + "\n");
		});
		yield new Promise(function(resolve) {
			chunkStream.on('end', resolve);
		});
	}
}).catch(function(e) {
	console.error(e.stack);
});
