/*tests from nano-dom*/
var Document = require('../');
var assert = require('chai').assert;


describe('Light DOM Implementation', function(){

	it('can parse this', function(){
	    var code = '<a href="#property-"></a><span class="memberAnchor" id=property-></span>';
        var document = new Document( code );
        assert.equal( document.documentElement.outerHTML, code, 'parsed code' );
	});


    it('Can parse a document', function(){
        var code = '<html><head><meta charset="UTF-8"/><title>Mein Titel</title></head><body><link arel="zino-tag" data-local="test.html"/><test></test></body></html>';
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
		assert.equal(document.body.innerHTML, '<div><test>1234<div><img src="test"/>test</div>Me</test></div>');
	});
	
	it('element access', function(){
		document = new Document('<div id="t1" class="test" __ready="true"><i id="italic" __ready="true">huhu</i></div><div __ready="true" id="t2" class="test"><b __ready="true" id="bold"></b></div>');
		let ids = document.querySelectorAll('[__ready]').map(el => el.getAttribute('id')).join(',');
        console.log(document.querySelectorAll('#bold'))

		assert.equal(ids, 't1,italic,t2,bold', 'finds all instances in correct order');
		console.log(document.getElementById('bold'))
		assert.equal(document.getElementById('bold').outerHTML, '<b __ready="true" id="bold"></b>');
	});

});