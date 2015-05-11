"use strict";

const Readable = require('stream').Readable;
const util = require('util');

function Chunk(inputStream, chunkSize, lastRemainder) {
	Readable.call(this);

	this._inputStream = inputStream;
	this._chunkSize = chunkSize;
	this._lastRemainder = lastRemainder;
	this._remainder = null;
	this._readBytes = 0;
	this._stop = false;
	this._inputExhausted = false;
	// TODO: need to remove these event to avoid small memory leak?
	this._inputStream.on('end', function() {
		this._inputExhausted = true;
		this.push(null);
	}.bind(this));
	this._inputStream.on('readable', function() {
		if(this._stop) {
			return;
		}
		// TODO: make sure this doesn't read entire stream
		// if no one is reading our stream
		var buf = this._inputStream.read();
		this._handleInputRead(buf);
	}.bind(this));
}
util.inherits(Chunk, Readable);

Chunk.prototype._handleInputRead = function(buf) {
	//console.log({buf});
	if(buf === null) {
		this.push('');
		return;
	}
	this._readBytes += buf.length;
	const overage = this._readBytes - this._chunkSize;
	//console.log({overage});
	if(overage >= 0) {
		this._stop = true;
		this._remainder = buf.slice(buf.length - overage);
		this.push(buf.slice(0, buf.length - overage));
		this.push(null);
	} else {
		this.push(buf);
	}
};

Chunk.prototype._read = function() {
	let buf;
	//console.log({date: new Date(), _lastRemainder: this._lastRemainder});
	if(this._lastRemainder !== null) {
		buf = this._lastRemainder;
		this._lastRemainder = null;
	} else {
		buf = this._inputStream.read();
	}
	this._handleInputRead(buf);
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
