"use strict";

const chunker = require('..');
const assert = require('assert');
const fs = require('fs');
const co = require('co');
const os = require('os');
const crypto = require('crypto');

// TODO: test 0-byte input source
// TODO: test non-0-byte but 1-chunk input source
// TODO: test with 1MB chunk size over 10.5MB file

describe('chunker', function() {
	it('chunks a stream into smaller streams', co.wrap(function*() {
		const params = [
			 {inputSize: 1024*1024, chunkSize: 17*1024}
			,{inputSize: 1024*1024*4.5, chunkSize: 1024*1024}
		];
		for(let p of params) {
			console.log(p);
			const input = crypto.pseudoRandomBytes(p.inputSize);
			const chunkSize = p.chunkSize;

			const tempfname = `${os.tmpdir()}/chunkertest`;
			const f = fs.openSync(tempfname, 'w');
			fs.writeSync(f, input, 0, input.length);
			fs.closeSync(f);

			const inputStream = fs.createReadStream(tempfname);
			inputStream.setMaxListeners(4096);

			let count = 0;
			for(let chunkStream of chunker.chunk(inputStream, chunkSize)) {
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
					assert.deepEqual(input.slice(chunkSize * count), writeBuf);
				} else {
					assert.equal(writeBuf.length, chunkSize);
					assert.deepEqual(input.slice(chunkSize * count, chunkSize * count + chunkSize), writeBuf);
				}
				count += 1;
			}
		}
	}));
});
