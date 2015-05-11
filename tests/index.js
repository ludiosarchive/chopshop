"use strict";

const chunker = require('..');
const assert = require('assert');
const fs = require('fs');
const co = require('co');
const os = require('os');

// TODO: test with 1MB chunk size over 10.5MB file

describe('chunker', function() {
	it('chunks a stream into smaller streams', co.wrap(function*() {
		const input = '\x00'.repeat(1024*1024);
		const chunkSize = 17*1024;

		const tempfname = `${os.tmpdir()}/chunker1mb`;
		const f = fs.openSync(tempfname, 'w');
		fs.writeSync(f, input);
		fs.closeSync(f);

		const inputStream = fs.createReadStream(tempfname);
		inputStream.setMaxListeners(4096);

		let count = 0;
		for(let chunkStream of chunker.chunk(inputStream, 17*1024)) {
			//console.log({count, chunkStream});
			let writeBuf = new Buffer(0);
			const doneReading = new Promise(function(resolve, reject) {
				chunkStream.on('data', function(data) {
					writeBuf = Buffer.concat([writeBuf, data]);
				});
				chunkStream.once('end', resolve);
			});
			yield doneReading;

			if(count == Math.floor(input.length / chunkSize)) {
				assert.equal('\x00'.repeat(input.length % chunkSize), writeBuf.toString("utf-8"));
			} else {
				assert.equal(writeBuf.length, chunkSize);
				assert.equal('\x00'.repeat(chunkSize), writeBuf.toString("utf-8"));
			}
			count += 1;
		}
	}));
});
