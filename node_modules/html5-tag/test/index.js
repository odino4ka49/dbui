import { test } from 'tap';
import tag from '../src';

test('End tags must not be specified for void elements', (t) => {
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
    voidElements.forEach(voidElement => {
        t.equal(tag(voidElement), '<' + voidElement + '>');
    });
    t.end();
});

test('Defaults to div if tag is not specified', (t) => {
    const result = tag({
        class: 'container'
    }, 'container text');
    const wanted = '<div class="container">container text</div>';
    t.equal(result, wanted);
    t.end();
});

test('Escapes special characters', (t) => {
    const result = tag('div', {
        class: 'container',
        title: '\'"&<>'
    }, tag('i', { class: 'icon' }));
    const wanted = '<div class="container" title="&#39;&quot;&amp;&lt;&gt;"><i class="icon"/></div>';
    t.equal(result, wanted);
    t.end();
});

test('Boolean attributes', (t) => {
    t.equal(tag('input', { type: 'checkbox', disabled: true }), '<input type="checkbox" disabled>');
    t.equal(tag('input', { type: 'checkbox', disabled: false, checked: true }), '<input type="checkbox" checked>');
    t.end();
});

test('A tag', (t) => {
    const result = tag('a', {
        class: 'btn btn-link',
        href: 'http://github.com/cheton/html-tag',
    }, 'http://github.com/cheton/html-tag');
    const wanted = '<a class="btn btn-link" href="http://github.com/cheton/html-tag">http://github.com/cheton/html-tag</a>'
    t.equal(result, wanted);
    t.end();
});

test('INPUT tag', (t) => {
    const result = tag('input', {
        name: 'name',
        value: 'Input your name...',
        disabled: true
    });
    const wanted = '<input name="name" value="Input your name..." disabled>';
    t.equal(result, wanted);
    t.end();
});
