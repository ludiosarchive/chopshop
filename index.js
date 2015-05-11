"use strict";

const Readable = require('stream').Readable;
const util = require('util');
const assert = require('assert');

function Chunk(inputStream, chunkSize, lastRemainder) {
	Readable.call(this);

	this._inputStream = inputStream;
	this._chunkSize = chunkSize;
	this._remainder = null;
	this._readBytes = 0;
	this._stopped = false;
	this._waiting = false;
	this._inputExhausted = false;
	this._boundInputEnd = this._inputEnd.bind(this);
	this._boundInputReadable = this._inputReadable.bind(this);

	if(lastRemainder !== null) {
		this._handleInputRead(lastRemainder);
	}
	if(this._stopped) {
		return;
	}

	this._inputStream.on('end', this._boundInputEnd);
	// We need to listen for this, to wake up the stream
	// machinery's calls of our _read()
	this._inputStream.on('readable', this._boundInputReadable);
}
util.inherits(Chunk, Readable);

Chunk.prototype._inputEnd = function() {
	if(this._stopped) {
		return;
	}
	this._stop();
	this._inputExhausted = true;
	this.push(null);
};

Chunk.prototype._inputReadable = function() {
	if(this._stopped || !this._waiting) {
		return;
	}
	var buf = this._inputStream.read();
	if(buf === null) {
		return;
	}
	this._waiting = false;
	this._handleInputRead(buf);
};

Chunk.prototype._stop = function() {
	if(this._stopped) {
		return;
	}
	this._stopped = true;
	this._inputStream.removeListener('end', this._boundInputEnd);
	this._inputStream.removeListener('readable', this._boundInputReadable);
};

Chunk.prototype._handleInputRead = function(buf) {
	this._readBytes += buf.length;
	const overage = this._readBytes - this._chunkSize;
	if(overage >= 0) {
		this._stop();
		this._remainder = buf.slice(buf.length - overage);
		this.push(buf.slice(0, buf.length - overage));
		this.push(null);
	} else {
		this.push(buf);
	}
};

Chunk.prototype._read = function() {
	const buf = this._inputStream.read();
	if(buf === null) {
		this._waiting = true;
	} else {
		this._handleInputRead(buf);
	}
};

function* chunk(inputStream, chunkSize) {
	if(!Number.isInteger(chunkSize) || chunkSize < 1) {
		throw new Error("chunkSize must be an integer >= 1");
	}
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
