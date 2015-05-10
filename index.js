"use strict";

const Readable = require('stream').Readable;
const util = require('util');

function Chunk(inputStream, chunkSize, lastRemainder) {
	this._inputStream = inputStream;
	this._chunkSize = chunkSize;
	this._lastRemainder = lastRemainder;
	this._remainder = null;
	this._readBytes = 0;
	this._inputExhausted = false;
	Readable.call(this);
}
util.inherits(Chunk, Readable);

Chunk.prototype._read = function() {
	let buf;
	console.log({_lastRemainder: this._lastRemainder});
	if(this._lastRemainder !== null) {
		buf = this._lastRemainder;
		this._lastRemainder = null;
	} else {
		buf = this._inputStream.read();
	}
	console.log({buf});
	if(buf === null) {
		this._inputExhausted = true;
		this.push(null);
		return;
	}
	this._readBytes += buf.length;
	const overage = this._readBytes - this._chunkSize;
	if(overage > 0) {
		this._remainder = buf.slice(overage);
		this.push(buf.slice(0, overage));
		this.push(null);
	} else if(overage == 0) {
		this.push(buf);
		this.push(null);
	} else {
		this.push(buf);
	}
};

function* chunk(inputStream, chunkSize) {
	let lastChunk = null;
	while(true) {
		if(lastChunk && lastChunk._inputExhausted) {
			return;
		}
		lastChunk = new Chunk(inputStream, chunkSize, lastChunk && lastChunk._remainder);
		yield lastChunk;
	}
}

module.exports = {chunk, Chunk};
