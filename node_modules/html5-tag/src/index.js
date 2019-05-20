import escapeHTML from 'escape-html';

// https://www.w3.org/TR/html5/syntax.html#void-elements
// Void elements only have a start tag; end tags must not be specified for void elements.
const voidElements = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'keygen',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
];

// @param {string} [tag] The tag name. Defaults to 'div'.
// @param {object} attrs HTML attributes.
// @param {string} [text] The content string.
module.exports = (tag, attrs, text) => {
    if (typeof tag === 'object') {
        text = attrs;
        attrs = tag;
        tag = 'div';
    }

    let voidElement = voidElements.indexOf(('' + tag).toLowerCase()) >= 0;
    let html = '<' + tag;

    attrs = { ...attrs };
    Object.keys(attrs).forEach(name => {
        let value = attrs[name];
        if (typeof value === 'string') {
            value = escapeHTML('' + value);
            html += ' ' + name + '="' + value + '"';
        } else if (!!value) {
            html += ' ' + name;
        }
    });

    if (voidElement) {
        html += '>';
    } else if (text !== undefined) {
        html += '>' + text + '</' + tag + '>';
    } else {
        html += '/>';
    }

    return html;
};
