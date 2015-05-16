"use strong";
"use strict";

const Readable = require('stream').Readable;
const util = require('util');

function Chunk(count, inputStream, chunkSize, lastRemainder, lastInputExhausted) {
	Readable.call(this);

	this._count = count;
	this._inputStream = inputStream;
	this._chunkSize = chunkSize;
	this._remainder = null;
	this._readBytes = 0;
	this._stopped = false;
	this._waiting = false;
	this._inputExhausted = false;
	this._lastRemainderLength = lastRemainder && lastRemainder.length;
	this._lastInputExhausted = lastInputExhausted;

	if(lastRemainder !== null) {
		this._handleInputRead(lastRemainder);
	}
	if(lastInputExhausted) {
		this._inputEnd();
	}
}
util.inherits(Chunk, Readable);

Chunk.prototype.inspect = function() {
	return `<Chunk #${this._count}` +
		` read ${this._readBytes}/${this._chunkSize}` +
		` lastRemainder.length=${this._lastRemainderLength}` +
		` lastInputExhausted=${this._lastInputExhausted}` +
		` waiting=${this._waiting}` +
		` stopped=${this._stopped}` +
		`>`;
};

Chunk.prototype._inputEnd = function() {
	this._inputExhausted = true;
	this._stop();
};

Chunk.prototype._inputReadable = function() {
	if(this._stopped || !this._waiting) {
		return;
	}
	const buf = this._inputStream.read();
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
	this.push(null);
};

Chunk.prototype._handleInputRead = function(buf) {
	this._readBytes += buf.length;
	const overage = this._readBytes - this._chunkSize;
	if(overage > 0) {
		this._remainder = buf.slice(buf.length - overage);
		this.push(buf.slice(0, buf.length - overage));
		this._stop();
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
	let count = 0;
	let lastChunk = null;
	function _end() {
		lastChunk._inputEnd();
	}
	function _readable() {
		lastChunk._inputReadable();
	}
	function _cleanup() {
		inputStream.removeListener('end', _end);
		inputStream.removeListener('readable', _readable);
	}
	inputStream.on('end', _end);
	inputStream.on('readable', _readable);
	while(true) {
		lastChunk = new Chunk(
			count,
			inputStream,
			chunkSize,
			lastChunk && lastChunk._remainder,
			lastChunk && lastChunk._inputExhausted);
		yield lastChunk;
		if(lastChunk._inputExhausted && !lastChunk._remainder) {
			_cleanup();
			return;
		}
		if(!lastChunk._stopped) {
			_cleanup();
			throw new Error("Can't yield another chunk until the previous chunk is fully read");
		}
		count++;
	}
}

module.exports = {chunk, Chunk};
