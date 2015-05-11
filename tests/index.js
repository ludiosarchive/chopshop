"use strict";

const chunker = require('..');
const assert = require('assert');
const fs = require('fs');
const co = require('co');
const os = require('os');
const crypto = require('crypto');

describe('chunker', function() {
	it('chunks a stream into smaller streams', co.wrap(function*() {
		const params = [
			 {inputSize: 0, chunkSize: 1}
			,{inputSize: 1, chunkSize: 1}
			,{inputSize: 3, chunkSize: 2}
			,{inputSize: 3, chunkSize: 10}
			,{inputSize: 1024*1024, chunkSize: 1024*1024*10}
			,{inputSize: 1024*1024, chunkSize: 17*1024}
			,{inputSize: 1024*1024*4.5, chunkSize: 1024*1024}
		];
		for(let p of params) {
			//console.log(p);
			const inputSize = p.inputSize;
			const chunkSize = p.chunkSize;
			const input = crypto.pseudoRandomBytes(inputSize);

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

			const expectedChunks = Math.floor((inputSize / chunkSize) + 1);
			assert.equal(count, expectedChunks);
		}
	}));
});
