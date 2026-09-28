/*tests from nano-dom*/
var Document = require('../');
var assert = require('chai').assert;


describe('Light DOM Implementation', function(){

	it('can parse this', function(){
	    var code = `<a href="#property-"></a><span class="memberAnchor" g='h' id=property-></span>`;
        var document = new Document( code );
        assert.equal( document.documentElement.outerHTML,
					'<html><head></head><body><a href="#property-"></a><span class="memberAnchor" g="h" id="property-"></span></body></html>', 'parsed code' );
	});


    it('Can parse a document', function(){
        var code = '<html><head><meta charset="UTF-8"><title>Mein Titel</title></head><body><link arel="zino-tag" data-local="test.html"/><test></test></body></html>';
        var document = new Document( '<!DOCTYPE html>' + code );
        assert.equal( document.documentElement.outerHTML, code, 'parsed code' );




    } );
    it('Can parse a document2', function(){
        let code = '<html lang="en"><head><title>Mein Titel</title></head><body><link rel="zino-tag" data-local="test.html"/><test></test></body></html>';
        document = new Document( '<!DOCTYPE html>' + code );
        assert.equal( document.documentElement.getAttribute( 'lang' ), 'en', 'correctly applies document element attributes' );
    });
    it('Element creation', function(){
        assert.equal( new Document().createElement( 'div' ).outerHTML, '<div></div>' )
    } );
    it('can parse document fragments', function(){
        let code = '<div class="Hallo">World!</div>';
        document = new Document( code );
        assert.equal( document.documentElement.outerHTML, '<html><head></head><body>' + code + '</body></html>', 'added it to correct position in DOM' );
    } );


	it('supports simple traversing features', function(){
        let code = '<div class="Hallo">World!</div>';
        document = new Document( code );
		assert.equal(document.documentElement.children[0].parentNode, document.documentElement, 'supports children and parentNode');
		assert.equal(document.querySelectorAll('.Hallo').length, 1, 'supports querySelectorAll for classes');
		assert.equal(document.getElementsByClassName('Hallo').length, 1, 'supports getElementsByClassName');
		assert.equal(document.getElementsByTagName('body')[0], document.body, 'supports getElementsByTagName');
	});
	
	it('allows DOM modification', function(){
        let code = '<div class="Hallo">World!</div>';
        document = new Document( code );

		let object = document.createElement('object');
		object.setAttribute('src', '/test.obj');
		document.body.appendChild(object);
		assert.equal(document.body.innerHTML, '<div class="Hallo">World!</div><object src="/test.obj"></object>', 'supports setAttribute and appendChild');
		assert.equal(document.body.children[0], document.querySelectorAll('.Hallo')[0], 'is sorted into correct position');
		document.body.removeChild(document.body.children[0]);
		assert.equal(document.body.innerHTML, '<object src="/test.obj"></object>', 'supports removeChild');
	});
	
	it('supports default child properties', function(){
		let code = `
	<!DOCTYPE html>
	<html>
	<head>
	<meta charset="UTF-8"/>
	<meta http-equiv="x-ua-compatible" content="ie=edge"/>
	<meta name="viewport" content="width=device-width, initial-scale=1"/>
	
	<title></title>
	
	<link href="favicon.ico" rel="shortcut icon"/>
	
	<meta name="description" content="  global.storename"/>
	<meta name="keywords" content="  global.storename"/>
	
	<link rel="stylesheet" href="style.css"/>
	
	<script type="text/javascript">//
	</script><script type="text/javascript">//
	</script>
	
	<meta name="rqid" content="6T4rQfds1lUpSYoAgAK"/><link type="text/css" href="dynamic.css" rel="stylesheet" /></head>
	<body><iframe src="/start" width="0px" height="0px"></iframe>
	
	<h1>Headline</h1>
	
	
	
	<link rel="zino-tag" data-local="components/example.html"/>
	<example/>
	
	
	
	<script type="text/javascript" src="test.js"></script>
	<script>
	window.urls = {"test": "1234"};
	</script>
	<script type="text/javascript" src="main.js"></script>
	
	</body>
	</html>`;
		document = new Document(code);
		assert.equal(document.head, document.documentElement.children[0], 'head is defined');
		assert.equal(document.body, document.documentElement.children[1], 'body is defined');
		console.log(document.outerHTML)
		assert.equal(document.getElementsByTagName('example').length, 1, 'can find custom component');
		assert.equal(document.querySelectorAll('[rel="zino-tag"]').length, 1, 'can find zino link');
	});
	
	it('attribute access', function(){
		document = new Document('<div class="test" data-value="me">test</div>');
		assert.equal(document.getElementsByClassName('test')[0].getAttribute('data-value'), 'me', 'getAttribute returns correct value');
		assert.equal(document.getElementsByClassName('test')[0].attributes['data-value'].value, 'me', 'attributes array returns correct value');
		assert.equal(document.getElementsByClassName('test')[0].attributes[1].name, 'data-value', 'attributes array has numerical access');
		assert.equal(document.getElementsByClassName('test')[0].attributes[1].value, 'me', 'attributes array numerical access returns correct value');
        assert.equal(document.getElementsByClassName('test')[0].attributes['class'] !== 'test', true, 'attributes array does not directly provide access to value');
	});
	
	it('parsing speed', function(){
		let fs = require('fs');
		let code = fs.readFileSync('./test/test.html', 'utf-8');
		document = new Document(code);
	});
	
	it('can deal with broken innerHTML data', function(){
		document = new Document('<div></div>');

		document.body.children[0].innerHTML = '<test>1234<div><img src="test">test</div>Me';

		// autoclose tags
		assert.equal(document.body.innerHTML, '<div><test>1234<div><img src="test">test</div>Me</test></div>');
	});
	
	it('element access', function(){
		document = new Document('<div id="t1" class="test" __ready="true"><i id="italic" __ready="true">huhu</i></div><div __ready="true" id="t2" class="test"><b __ready="true" id="bold"></b></div>');
		let ids = document.querySelectorAll('[__ready]').map(el => el.getAttribute('id')).join(',');
        console.log(document.querySelectorAll('#bold'))

		assert.equal(ids, 't1,italic,t2,bold', 'finds all instances in correct order');
		console.log(document.getElementById('bold'))
		assert.equal(document.getElementById('bold').outerHTML, '<b __ready="true" id="bold"></b>');
	});


	// A node lives in ONE parent: appending a node that already has one MOVES it.
	// These used to push into the new parent while the old one still listed the
	// same element, so it appeared in two childNodes lists at once.
	it('appendChild moves a node instead of duplicating it', function(){
		document = new Document('<div id="a"></div><div id="b"></div>');
		var a = document.getElementById('a'), b = document.getElementById('b');
		var kid = document.createElement('span');

		a.appendChild(kid);
		assert.equal(a.childNodes.length, 1, 'kid is in a');

		b.appendChild(kid);
		assert.equal(b.childNodes.length, 1, 'kid moved to b');
		assert.equal(a.childNodes.length, 0, 'and is gone from a');
		assert.equal(kid.parentNode, b, 'parentNode follows the move');
	});

	it('insertBefore moves a node instead of duplicating it', function(){
		document = new Document('<div id="a"></div><div id="b"><i id="ref"></i></div>');
		var a = document.getElementById('a'), b = document.getElementById('b');
		var ref = document.getElementById('ref');
		var kid = document.createElement('span');

		a.appendChild(kid);
		b.insertBefore(kid, ref);

		assert.equal(a.childNodes.length, 0, 'gone from the old parent');
		assert.equal(b.childNodes.length, 2, 'b has ref + kid');
		assert.equal(b.childNodes[0], kid, 'inserted BEFORE ref');
	});

	// null refChild means append (DOM spec). This used to hit indexOf === -1 and
	// splice(-1, 0, x), which silently inserted before the LAST child.
	it('insertBefore(node, null) appends', function(){
		document = new Document('<div id="p"><i id="one"></i><i id="two"></i></div>');
		var p = document.getElementById('p');
		var kid = document.createElement('span');

		p.insertBefore(kid, null);

		assert.equal(p.childNodes.length, 3);
		assert.equal(p.childNodes[2], kid, 'appended, not inserted before the last child');
	});

	it('insertBefore with a refChild that is not ours appends', function(){
		document = new Document('<div id="p"><i id="one"></i><i id="two"></i></div><div id="other"><b id="stranger"></b></div>');
		var p = document.getElementById('p');
		var stranger = document.getElementById('stranger');
		var kid = document.createElement('span');

		p.insertBefore(kid, stranger);

		assert.equal(p.childNodes.length, 3);
		assert.equal(p.childNodes[2], kid, 'appended rather than landing before the last child');
	});

	// splice(-1, 1) used to drop the LAST child when the argument was not ours.
	it('removeChild of a node that is not a child leaves the list alone', function(){
		document = new Document('<div id="p"><i id="one"></i><i id="two"></i></div>');
		var p = document.getElementById('p');
		var stranger = document.createElement('span');

		p.removeChild(stranger);

		assert.equal(p.childNodes.length, 2, 'nothing was removed');
		assert.equal(p.childNodes[1].getAttribute('id'), 'two', 'and the last child survived');
	});

	it('appendChild drains a DocumentFragment, like a browser', function(){
		document = new Document('<div id="p"></div>');
		var p = document.getElementById('p');
		var frag = document.createDocumentFragment([
			document.createElement('i'), document.createElement('b')
		]);

		p.appendChild(frag);

		assert.equal(p.childNodes.length, 2, 'both children moved across');
		assert.equal(frag.childNodes.length, 0, 'fragment is empty afterwards');
		assert.equal(p.childNodes[0].parentNode, p, 'parentNode re-pointed');
	});

	// document.activeElement never changed before — not on .focus(), not on a
	// dispatched focus event — so every focus-dependent branch in a consumer read
	// as "unfocused" and was effectively untested.
	it('focus() sets document.activeElement and fires the handler', function(){
		document = new Document('<input id="one"><input id="two">');
		var one = document.getElementById('one');
		var fired = 0;

		one.addEventListener('focus', function(){ fired++; });
		one.focus();

		assert.equal(document.activeElement, one, 'activeElement follows focus');
		assert.equal(fired, 1, 'focus handler ran');
	});

	it('focusing another element blurs the previous one first', function(){
		document = new Document('<input id="one"><input id="two">');
		var one = document.getElementById('one'), two = document.getElementById('two');
		var order = [];

		one.addEventListener('blur', function(){
			// The browser has already moved activeElement by the time blur fires.
			order.push('blur:' + (document.activeElement === two ? 'two' : 'other'));
		});
		two.addEventListener('focus', function(){ order.push('focus'); });

		one.focus();
		two.focus();

		assert.equal(document.activeElement, two);
		assert.equal(order.join(','), 'blur:two,focus');
	});

	it('blur() clears activeElement back to body', function(){
		document = new Document('<input id="one">');
		var one = document.getElementById('one');
		var fired = 0;
		one.addEventListener('blur', function(){ fired++; });

		one.focus();
		one.blur();

		assert.equal(document.activeElement, document.body, 'nothing focused reads as body');
		assert.equal(fired, 1);
	});

	it('re-focusing the already focused element is a no-op', function(){
		document = new Document('<input id="one">');
		var one = document.getElementById('one');
		var fired = 0;
		one.addEventListener('focus', function(){ fired++; });

		one.focus();
		one.focus();

		assert.equal(fired, 1, 'second focus did not re-fire');
	});


	// Every `new Document()` overwrites global.document, so focus must resolve the
	// node's OWN document by walking up to the root — otherwise focusing in the
	// first document would move activeElement onto the most recently created one.
	it('focus targets the node OWN document, not the newest global one', function(){
		var docA = new Document('<input id="a">');
		var a = docA.getElementById('a');
		var docB = new Document('<input id="b">');   // this reassigned global.document
		var b = docB.getElementById('b');

		a.focus();

		assert.equal(docA.activeElement, a, 'docA tracks its own focus');
		assert.equal(docB.activeElement, docB.body, 'docB was left untouched');

		b.focus();
		assert.equal(docB.activeElement, b);
		assert.equal(docA.activeElement, a, 'docA still unchanged');
	});

	// Widgets are commonly built and focused BEFORE being mounted.
	it('focus works on a detached element via the ambient document', function(){
		document = new Document('<div id="p"></div>');
		var loose = document.createElement('input');
		var fired = 0;
		loose.addEventListener('focus', function(){ fired++; });

		loose.focus();

		assert.equal(fired, 1, 'handler still runs when unmounted');
		assert.equal(document.activeElement, loose, 'ambient document records it');
	});

	it('a node moved between documents focuses in its NEW document', function(){
		var docA = new Document('<div id="pa"></div>');
		var pa = docA.getElementById('pa');
		var docB = new Document('<div id="pb"></div>');
		var pb = docB.getElementById('pb');

		var kid = docA.createElement('input');
		pa.appendChild(kid);
		pb.appendChild(kid);       // moves across documents

		kid.focus();

		assert.equal(docB.activeElement, kid, 'lands in the document it now lives in');
		assert.equal(docA.activeElement, docA.body, 'old document untouched');
	});

});