"use strong";
"use strict";

const Readable = require('stream').Readable;

class Chunk extends Readable {
	constructor(count, inputStream, chunkSize, lastRemainder, lastInputExhausted) {
		super();

		this._count = count;
		this._inputStream = inputStream;
		this._chunkSize = chunkSize;
		this._remainder = null;
		this._readBytes = 0;
		this._stopped = false;
		this._waiting = false;
		this._inputExhausted = false;
		this._lastRemainder = lastRemainder;
		this._lastInputExhausted = lastInputExhausted;
	}

	// Initialization must be finished outside the constructor because of strong mode
	init() {
		if(this._lastRemainder !== null) {
			this._handleInputRead(this._lastRemainder);
			// Free immediately
			this._lastRemainder = null;
		}
		if(this._lastInputExhausted) {
			this._inputEnd();
		}
	}

	inspect() {
		return `<Chunk #${this._count}` +
			` read ${this._readBytes}/${this._chunkSize}` +
			` lastInputExhausted=${this._lastInputExhausted}` +
			` waiting=${this._waiting}` +
			` stopped=${this._stopped}` +
			`>`;
	}

	_inputEnd() {
		this._inputExhausted = true;
		this._stop();
	}

	_inputReadable() {
		if(this._stopped || !this._waiting) {
			return;
		}
		const buf = this._inputStream.read();
		if(buf === null) {
			return;
		}
		this._waiting = false;
		this._handleInputRead(buf);
	}

	_stop() {
		if(this._stopped) {
			return;
		}
		this._stopped = true;
		this.push(null);
	}

	_handleInputRead(buf) {
		this._readBytes += buf.length;
		const overage = this._readBytes - this._chunkSize;
		if(overage > 0) {
			this._remainder = buf.slice(buf.length - overage);
			this.push(buf.slice(0, buf.length - overage));
			this._stop();
		} else {
			this.push(buf);
		}
	}

	_read() {
		const buf = this._inputStream.read();
		if(buf === null) {
			this._waiting = true;
		} else {
			this._handleInputRead(buf);
		}
	}
}

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
	// Do this on next tick, because 'readable' can fire synchronously
	// while lastChunk is still null.
	process.nextTick(function() {
		inputStream.on('end', _end);
		inputStream.on('readable', _readable);
	});
	while(true) {
		lastChunk = new Chunk(
			count,
			inputStream,
			chunkSize,
			lastChunk && lastChunk._remainder,
			lastChunk && lastChunk._inputExhausted);
		lastChunk.init();
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
