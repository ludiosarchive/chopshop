"use strict";

const Readable = require('stream').Readable;
const util = require('util');
const assert = require('assert');

function Chunk(inputStream, chunkSize, lastRemainder) {
	Readable.call(this);

	this._inputStream = inputStream;
	this._chunkSize = chunkSize;
	this._lastRemainder = lastRemainder;
	this._remainder = null;
	this._readBytes = 0;
	this._stop = false;
	this._waiting = false;
	this._inputExhausted = false;

	this._inputStream.once('end', function() {
		this._stop = true;
		this._inputExhausted = true;
		this.push(null);
	}.bind(this));

	// We need to listen for this, to wake up the stream
	// machinery's calls of our _read()
	this._inputStream.on('readable', function() {
		if(this._stop || !this._waiting) {
			return;
		}
		this._waiting = false;
		var buf = this._inputStream.read();
		if(buf === null) {
			return;
		}
		this._handleInputRead(buf);
	}.bind(this));
}
util.inherits(Chunk, Readable);

Chunk.prototype._handleInputRead = function(buf) {
	//console.log({buf});
	this._readBytes += buf.length;
	const overage = this._readBytes - this._chunkSize;
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
		this._handleInputRead(buf);
	} else {
		buf = this._inputStream.read();
		if(buf === null) {
			this._waiting = true;
		} else {
			this._handleInputRead(buf);
		}
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
