"use strict";

const chunker = require('..');
const streamBuffers = require('stream-buffers');

describe('chunker', function() {
	it('chunks a stream into smaller streams', function() {
		const inputSize = 1024*1024;
		const chunkSize = 17*1024;

		const buf = new Buffer(" ".repeat(inputSize));
		const streamBuf = new streamBuffers.ReadableStreamBuffer({
			frequency: 0,
			chunkSize: 2048
		});
		let count = 0;
		for(let chunkStream of chunker.chunk(streamBuf, 17*1024)) {
			const writeBuf = new streamBuffers.WritableStreamBuffer();
			chunkStream.pipe(writeBuf);
			// TODO: do we need to wait here for writes to finish?
			if(count == Math.floor(inputSize / chunkSize)) {
				assert.equal(" ".repeat(inputSize % chunkSize), chunkStream.getContentsAsString("utf-8"));
			} else {
				assert.equal(" ".repeat(chunkSize), chunkStream.getContentsAsString("utf-8"));
			}
		}
	});
});
