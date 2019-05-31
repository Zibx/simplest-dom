# simplest-dom

A simple DOM implementation that can be used on server-side for rendering and tests purpose.

Supports innerHTML\outerHTML, createElement and some simple query selectors

Usage example:
```js
import Dom from 'simplest-dom';
global.document = new Dom();

// test cases would think that document exists
```
