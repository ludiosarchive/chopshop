chopshop
===

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]

chopshop takes an io.js readable [stream](https://iojs.org/api/stream.html)
and yields a series of fixed-length streams.  This is particularly useful
if you need to convert a file into multiple files of size N.


Install
---

In your project, run:

```
npm install chopshop --save
```

or install from the GitHub repo:

```
npm install ludios/chopshop --save
```


API
---
```js
const chunk = require('chopshop').chunk;
chunk(readableStream, maxBytes);
```

`chunk` returns an iterable of readable streams, all `maxBytes` in size
except for the last chunk, which may be smaller.  You must finish reading
a chunk before you start reading the next chunk.  If your input stream
has 0 bytes, you still get one chunk with 0 bytes.


Example
---

```js
"use strict";

const chunk = require('chopshop').chunk;
const fs = require('fs');
const co = require('co');

co(function*() {
	for(const chunkStream of chunk(fs.createReadStream('/etc/passwd'), 100)) {
		chunkStream.on('data', function(data) {
			process.stdout.write(data);
			console.log("\n" + data.length + "\n");
		});
		yield new Promise(function(resolve) {
			chunkStream.on('end', resolve);
		});
	}
}).catch(function(e) {
	console.error(e.stack);
});
```

Be careful: you must not start reading from the next chunk before you finish
reading from the current chunk.  That's why we use `co` and a `Promise` above
to wait for the chunk to finish.

[npm-image]: https://img.shields.io/npm/v/chopshop.svg
[npm-url]: https://npmjs.org/package/chopshop
[travis-image]: https://img.shields.io/travis/ludios/chopshop.svg
[travis-url]: https://travis-ci.org/ludios/chopshop
