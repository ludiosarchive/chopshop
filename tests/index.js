"use strict";

const chunker = require('..');
const assert = require('assert');
const fs = require('fs');
const co = require('co');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

function streamToBuffer(stream) {
	return new Promise(function(resolve, reject) {
		let buf = new Buffer(0);
		stream.on('data', function(data) {
			buf = Buffer.concat([buf, data]);
		});
		stream.once('end', function() {
			resolve(buf);
		});
	});
}

/**
 * Like streamToBuffer, but use real files to create backpressure.
 */
function streamToFileToBuffer(stream) {
	const tempFname = path.join(os.tmpdir(), 'chopshop-tests-' + Math.random());
	const writeStream = fs.createWriteStream(tempFname);
	return new Promise(function(resolve) {
		writeStream.once('finish', function() {
			const buf = fs.readFileSync(tempFname);
			fs.unlinkSync(tempFname);
			resolve(buf);
		});
		stream.pipe(writeStream);
	});
}

describe('chunker', function() {
	it('throws Error for bad chunkSizes', function() {
		for(let chunkSize of [0.5, -0.5, -2, false, "3"]) {
			assert.throws(function() {
				const c = chunker.chunk(null, chunkSize);
				c.next();
			}, /chunkSize must be/);
		}
	});

	it('throws Error when asked to yield another chunk before the previous chunk is fully read', function() {
		const input = crypto.pseudoRandomBytes(1024);
		const tempfname = `${os.tmpdir()}/chunkertest`;
		const f = fs.openSync(tempfname, 'w');
		fs.writeSync(f, input, 0, input.length);
		fs.closeSync(f);

		const inputStream = fs.createReadStream(tempfname);

		const iter = chunker.chunk(inputStream, 128);
		iter.next();
		assert.throws(function() {
			iter.next();
		}, /until the previous chunk is fully read/);
	});

	it('chunks a stream into smaller streams', co.wrap(function*() {
		this.timeout(5000);

		const params = [
			 {inputSize: 0, chunkSize: 1}
			,{inputSize: 1, chunkSize: 1}
			,{inputSize: 3, chunkSize: 2}
			,{inputSize: 3, chunkSize: 10}
			,{inputSize: 1024*1024, chunkSize: 100}
			,{inputSize: 1024*1024, chunkSize: 100*1024}
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

			let count = 0;
			for(let chunkStream of chunker.chunk(inputStream, chunkSize)) {
				//console.log({count, chunkStream});
				//let writeBuf = yield streamToBuffer(chunkStream);
				let writeBuf = yield streamToFileToBuffer(chunkStream);

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
