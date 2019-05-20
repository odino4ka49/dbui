# html5-tag [![build status](https://travis-ci.org/cheton/html5-tag.svg?branch=master)](https://travis-ci.org/cheton/html5-tag) [![Coverage Status](https://coveralls.io/repos/cheton/html5-tag/badge.svg)](https://coveralls.io/r/cheton/html5-tag)
[![NPM](https://nodei.co/npm/html5-tag.png?downloads=true&stars=true)](https://nodei.co/npm/html5-tag/)

A simple utility for creating HTML tags.

## Installation

```bash
npm install --save html5-tag
```

## Usage
```js
import tag from 'html5-tag';

// No end tags for void elements (https://www.w3.org/TR/html5/syntax.html#void-elements)
tag('br');
// → '<br>'

tag('a', { href: 'http://example.com' }, 'Example');
// → '<a href="http://example.com">Example</a>'

tag('input', { name: 'name', value: 'Input your name...', disabled: true });
// → '<input name="name" value="Input your name..." disabled>'

tag('div', { title: '\'"&<>' }, tag('i', { class: 'icon icon-folder' }, ''));
// → '<div title="&#39;&quot;&amp;&lt;&gt;"><i class="icon icon-folder"></i></div>'

// Defaults to 'div' if tag is not specified
tag({ class: 'container' }, 'container text');
// → '<div class="container">container text</div>'
```

## License

Copyright (c) 2016 Cheton Wu

Licensed under the [MIT License](LICENSE).
