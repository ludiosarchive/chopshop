"use strict";

const Readable = require('stream').Readable;
const util = require('util');

function Chunk(opt) {
	Readable.call(this, opt);
}
util.inherits(Chunk, Readable);

Chunk.prototype._read = function() {

}

function* chunk(inputStream, chunkSize) {
	let done = false;
	inputStream.on('data', function() {
		
	});
	inputStream.on('end', function() {

	});
	while(!done) {
		let c = new Chunk();
		yield c;
	}
}
