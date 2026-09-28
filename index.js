/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * *
 */
;// QUOKKA 2018
// By Kubota Ivan on 2/2/18.

module.exports = (function(){
    'use strict';
    let doc, Node, DocumentFragment;

    if(typeof document === 'undefined'){
        doc = (function(){
            const attrRegExp = /\s*([^>="'\s]+)\s*?(=?)\s*?(?:"([^"]*)"|'([^']*)'|([^\s]*))/g;
            let parseAttrs = function(attrs) {
                const _self = this;
                attrs.replace(attrRegExp, function(a,b,equal,c,d,e) {
                    _self.setAttribute(b,
                      c !== void 0 ? c : d !== void 0 ? d : e !== void 0 ? e : null,
                      c !== void 0 ? 1: d !== void 0 ? 2 : equal !== '' ? 3 : 0
                    );

                });

            };
            var c = 0;
            // take any tag with arguments.
            const tagRegExp = /<(\/?!?[A-Za-z0-9_-]+)((?:\s+(?:[^>="'\s\/]+\s*(?:=\s*(?:"[^"]*"|'[^']*'|[^\s>\/]*))?))*)\s*(\/?)>/;
            const commentRegExp = /<(!--)(.*?--)>/;
            let parseHTML = function(text){
                const tags = [];
                let root = new Node('root');
                const stack = [root];

                let inComment = false;

                while(text.length > 0){

                    let chunkLength = 0;
                    let chunkTextLength = 0;
                    let tag = false;
                    let closingTag = false;
                    let selfClosing = false;
                    let tagData = text.match(tagRegExp);
                    let isComment = false;

                    if(tagData === null){
                        chunkLength = chunkTextLength = text.length;
                    }else {
                        if(tagData[1] === '!--'){
                            // COMMENT CASE
                            var closeCommentPos = text.substr(tagData.index+4)
                              .indexOf('-->')+4;

                            var commentMatch = [
                                text.substr(tagData.index, closeCommentPos - tagData.index+3),
                                '!--'
                            ];
                            commentMatch.push(commentMatch[0].substr(4,commentMatch[0].length-5));
                            commentMatch[3] = '';
                            commentMatch.index = tagData.index;
                            tagData = commentMatch;
                            //tagData.index = text.indexOf( commentMatch[0] )
                            isComment = true;
                        }
                        const tagLength = tagData[0].length,
                          tagName = tagData[1],
                          tagAttrs = tagData[2];

                        selfClosing = tagData[3];

                        if(tagName.charAt(0) !== '/'){
                            tag = new Node(tagName);
                            if(isComment){
                                tag.nodeType = 8;
                                tag._innerText = tagAttrs;
                            }else {
                                parseAttrs.call( tag, tagAttrs )
                                tag._selfClose = selfClosing;
                            }
                        }else{
                            closingTag = tagName.substr(1).toLowerCase();
                        }

                        chunkTextLength = tagData.index;
                        chunkLength = tagData.index+tagLength;
                    }

                    if(chunkTextLength){
                        let textNode = new Node('TextNode');
                        textNode.nodeType = 3;
                        textNode.innerText = text.substr(0,chunkTextLength);
                        root.appendChild(textNode);
                    }
                    if(tag){
                        root.appendChild(tag);
                        if(!selfClosing && !(tag.nodeName.toLowerCase() in noClose)) {
                            root = tag;
                            stack.push(tag)
                        }
                    }else if(closingTag) {
                        if (closingTag === stack[stack.length - 1].nodeName) {
                            stack.pop();
                            root = stack[stack.length - 1];
                        } else {
                            if(stack[stack.length - 2] === void 0)
                                debugger
                            if (closingTag === stack[stack.length - 2].nodeName) {
                                stack.pop();
                                stack.pop();
                                root = stack[stack.length - 1];
                            }
                        }
                    }
                    text = text.substr(chunkLength);
                }
                return stack[0] && stack[0].childNodes;
            };
            const regExp = function(name) {
                return new RegExp('(^| )'+ name +'( |$)');
            };
            const ClassList = function(node){
                this._node = node;
            };
            var forEach = function(el, fn, scope){
                for( var i = 0, _i = el.length; i < _i; i++)
                    fn.call(scope || el[i], el[i],i,el);
            };
            ClassList.prototype = {
                add: function() {
                    forEach(arguments, function(name) {
                        if (!this.contains(name)) {
                            this._node.className += this._node.className.length > 0 ? ' ' + name : name;
                        }
                    }, this);
                },
                remove: function() {
                    forEach(arguments, function(name) {
                        this._node.className = this._node.className.replace(regExp(name), '');
                    }, this);
                },
                toggle: function(name) {
                    return this.contains(name)
                      ? (this.remove(name), false) : (this.add(name), true);
                },
                contains: function(name) { // REWRITE THIS
                    return regExp(name).test(this._node.className);
                }
            };

            Node = function(type){
                this.nodeName = type.toLowerCase();
                this.childNodes = [];
                this.attributes = [];

                this.classList = new ClassList(this);
                this._listeners = {};
                this.style = {};
            };
            var Attribute = function(key, value, quoteType){
                this.name = key;
                this.value = value;
                this.quoteType = quoteType;
            };

            var slice = Array.prototype.slice;
            // A node lives in ONE parent. appendChild/insertBefore used to push
            // into the new parent without unlinking from the old one, so the same
            // element appeared in two childNodes lists at once — the browser MOVES
            // it. Called by both, and by nothing else.
            // Which document owns this node? `createElement` returns a bare Node with
            // no back-reference, so walk up to the root instead: the factory marks the
            // document with nodeType 9. A DETACHED node (a widget built but not yet
            // mounted) has no root document — fall back to the ambient one if a
            // consumer assigned it, as the README suggests, so focusing an unmounted
            // element still works. Deliberately NOT `global.document` alone: that is
            // overwritten by the most recently constructed document, so it would move
            // activeElement onto the wrong one as soon as a second document exists.
            var ownerDocumentOf = function(node){
                var el = node;
                while( el.parentNode ) el = el.parentNode;
                if( el.nodeType === 9 ) return el;
                return typeof global !== 'undefined' && global.document && global.document.nodeType === 9 ?
                  global.document : null;
            };
            var detachFromParent = function(node){
                var parent = node.parentNode;
                if( !parent || !parent.childNodes ) return;
                var index = parent.childNodes.indexOf( node );
                if( index !== -1 ) parent.childNodes.splice( index, 1 );
                node.parentNode = null;
            };
            Node.prototype = {
                addEventListener: function(evtName, fn){
                    (this._listeners[evtName] || (this._listeners[evtName] = [])).push(fn);
                },
                removeEventListener: function(evtName, fn) {
                    const evts = this._listeners[evtName];
                    if(evts)
                        this._listeners[evtName] = evts.filter(function(evt) { return evt !== fn;});
                },
                emit: function(evtName){
                    var _self = this, args = slice.call(arguments,1);
                    (this._listeners[evtName] || []).forEach(function(fn){
                        fn.apply(_self, args);
                    });
                },
                // document.activeElement used to never change — not on .focus(), not
                // on a dispatched focus event — so every focus-dependent branch in a
                // consumer read as "unfocused" and was effectively untested.
                // Order matches the browser: the old element blurs FIRST, and
                // activeElement already points at the new one when 'focus' fires.
                focus: function(){
                    var doc = ownerDocumentOf( this );
                    if( doc ){
                        if( doc.activeElement === this ) return;
                        var prev = doc.activeElement;
                        doc.activeElement = this;
                        if( prev && prev !== this && prev.emit ) prev.emit('blur');
                    }
                    this.emit('focus');
                },
                blur: function(){
                    var doc = ownerDocumentOf( this );
                    // Nothing focused is <body> in a browser, not null.
                    if( doc && doc.activeElement === this ) doc.activeElement = doc.body || null;
                    this.emit('blur');
                },
                appendChild: function(child){
                    if( child instanceof DocumentFragment ){
                        // Snapshot: detaching each child mutates the fragment's own
                        // childNodes, so iterating it live would skip every other one.
                        // Draining it is also what a browser does — a fragment is
                        // empty after you append it.
                        var moving = slice.call( child.childNodes );
                        for( var i = 0, _i = moving.length; i < _i; i++ ){
                            var childNode = moving[ i ];
                            detachFromParent( childNode );
                            this.childNodes.push( childNode );
                            childNode.parentNode = this;
                        }
                    }else{
                        detachFromParent( child );
                        this.childNodes.push( child );
                        child.parentNode = this;
                    }
                },
                insertBefore: function(newChild, refChild){
                    // refChild null/undefined means APPEND (DOM spec), and a refChild
                    // that is not ours used to give indexOf === -1, where splice(-1,...)
                    // silently inserted before the LAST child. Both now append.
                    var index = refChild == null ? -1 : this.childNodes.indexOf( refChild );
                    if( index === -1 ) index = this.childNodes.length;
                    if( newChild instanceof DocumentFragment ){
                        var moving = slice.call( newChild.childNodes );
                        for( var i = 0, _i = moving.length; i < _i; i++ ){
                            detachFromParent( moving[ i ] );
                        }
                        // Detaching may have removed nodes sitting before `index`
                        // (re-inserting this parent's own children), so re-resolve it.
                        if( refChild != null ){
                            var reIndex = this.childNodes.indexOf( refChild );
                            index = reIndex === -1 ? this.childNodes.length : reIndex;
                        }else{
                            index = this.childNodes.length;
                        }
                        this.childNodes.splice.apply( this.childNodes, [ index, 0 ].concat( moving ) );
                        for( var j = 0, _j = moving.length; j < _j; j++ ){
                            moving[ j ].parentNode = this;
                        }
                    }else{
                        detachFromParent( newChild );
                        if( refChild != null ){
                            var refIndex = this.childNodes.indexOf( refChild );
                            index = refIndex === -1 ? this.childNodes.length : refIndex;
                        }else{
                            index = this.childNodes.length;
                        }
                        this.childNodes.splice( index, 0, newChild );
                        newChild.parentNode = this;
                    }
                },
                removeChild: function(child){
                    var index = this.childNodes.indexOf(child);
                    // Not ours: splice(-1, 1) used to drop the LAST child instead.
                    if( index === -1 ) return child;
                    child.parentNode = null;
                    this.childNodes.splice(index, 1);
                    return child;
                },
                setAttribute: function(k, v, quoteType){
                    const attr = new Attribute(k, v, quoteType);
                    var exists = this.attributes.hasOwnProperty(k);
                    var old = this.attributes[k];
                    this.attributes[k] = attr;
                    if(exists){
                        this.attributes.splice(this.attributes.indexOf(old),1,attr);
                    }else{
                        this.attributes.push(attr);
                    }
                },
                removeAttribute: function(k) {
                    var exists = this.attributes.hasOwnProperty(k);

                    if(exists){
                        delete this.attributes[ k ];
                        this.attributes.splice(this.attributes.indexOf(this.attributes[k]),1);
                    }
                },
                getAttribute: function(k){
                    return (this.attributes[k] || {}).value;
                },
                createElement: function(type){
                    return new Node(type);
                },
                createTextNode: function(val){
                    const textNode = new Node('textnode');
                    textNode.nodeType = 3;
                    textNode.innerText = val;
                    return textNode;
                },
                querySelectorAll: function(selector){
                    let result = [];
                    this.children.forEach( function( child ){
                        result = result.concat( matchesSelector( child, selector ) ? child : [], child.querySelectorAll( selector ) );
                    } );
                    return result;
                },
                querySelector: function(selector){
                    return this.querySelectorAll(selector)[0];
                },
                getElementsByClassName: function(selector){
                    return this.querySelectorAll('.'+selector);
                },
                getElementById: function(selector){
                    return this.querySelector('#'+selector);
                },
                getElementsByTagName: function(selector){
                    return this.querySelectorAll(selector);
                },
                nodeType: 1,
                contains: function(el){
                    while( el.parentNode ){
                        if( el.parentNode === this )
                            return true;
                        el = el.parentNode;
                    }
                    return false;
                }
            };

            var FakeEvent = function() {};
            FakeEvent.prototype = {
                stopPropagation: function() {},
                preventDefault: function() {}
            };
            'click,mousemove,mouseup,mousedown,keydown'.split( ',' ).forEach( function( a ) {
                Node.prototype[ a ] = function() {
                    return this.emit( a, new FakeEvent() );
                };
            } );

            function matchesSelector(tag, selector) {
                let selectors = selector.split(/\s*,\s*/),
                  match;
                for (let all in selectors) {

                    //if (match = selectors[all].match(/(?:([\w*:_-]+)?\[([\w:_-]+)(?:(\$|\^|\*)?=(?:(?:'([^']*)')|(?:"([^"]*)")))?\])|(?:\.([\w_-]+))|([\w*:_-]+)/g)) {
                    if (match = selectors[all].match(/((?:(?:\.|#)?[\w]+)*)((?:\[([^\]=]+(?:=(?:\w*|"[^"]*"|'[^']*'))?)\])*)(:{1,2}\w+)*/)) {
                        if(match[1]){
                            var classID = match[1].match(/(?:\.|#)?\w+/g);
                            if(classID){
                                for(var i = 0, _i = classID.length; i < _i; i++){
                                    var id = classID[i];
                                    if( id.charAt( 0 ) === '#' ){
                                        if( tag.getAttribute( 'id' ) !== id.substr( 1 ) ){
                                            return false;
                                        }
                                    }else if( id.charAt( 0 ) === '.' ){
                                        if( !tag.classList.contains( id.substr( 1 ) ) ){
                                            return false;
                                        }
                                    }else{
                                        if(tag.tagName !== id){
                                            return false;
                                        }
                                    }
                                }

                            }
                        }
                        if(match[2]){
                            var attrs = match[2].match(/\[([^\]=]+(?:=(?:\w*|"[^"]*"|'[^']*'))?)\]/g);

                            for(i = 0, _i = attrs.length; i<_i;i++){
                                var attr = attrs[i];
                                attr = attr.substr(1, attr.length - 2);
                                var attrTokens = attr.split('=');
                                var attrName = attrTokens[0];
                                if(attrTokens.length>1){
                                    var attrVal = attrTokens.slice( 1 ).join( '=' );

                                    if(
                                      (attrVal.charAt( 0 ) === '"' && attrVal.charAt( attrVal.length - 1 ) === '"') ||
                                      (attrVal.charAt( 0 ) === '\'' && attrVal.charAt( attrVal.length - 1 ) === '\'')
                                    ){
                                        attrVal = attrVal.substr( 1, attrVal.length - 2 );
                                    }

                                    if( tag.getAttribute( attrName ) !== attrVal )
                                        return false;
                                }else{
                                    if(!(attrName in tag.attributes))
                                        return false;
                                }
                            }

                        }
                    }
                }
                return true;
            }
            const mayClose = {img: 1};
            const noClose = {
                br: 1,
                hr: 1,
                img: 1,
                meta: 1,
                link: 1,
                '!doctype': 1,
                '!--':1,
                'line': 1,
                path: 1
            };
            const autoClose = {
                '!doctype': 1,
                'meta': 1
            };
            Object.defineProperty(Node.prototype, 'className', {
                get: function(){
                    var className = this.getAttribute('class');
                    return className === void 0 ? '' : className;
                },
                set: function(className){
                    this.setAttribute('class', className);
                }
            });
            Object.defineProperty(Node.prototype, 'children', {
                get: function(){
                    return this.childNodes.filter(function(el){
                        return el.nodeName !== 'textnode';
                    })
                },
                set: function(className){
                    throw new Error('children is a protected property')
                }
            });

            Object.defineProperty(Node.prototype, 'tagName', {
                get: function(){
                    return this.nodeName;
                },
                set: function(className){
                    console.error('TagName is read only')
                }
            });
            Object.defineProperty(Node.prototype, 'innerHTML', {
                get: function () {
                    if('_innerHTML' in this){
                        return this._innerHTML;
                    }
                    if('_innerText' in this){

                    }
                    return this.childNodes.map(function(node){
                        return node.nodeName === 'textnode' ? node.textContent || node._innerText || '' : node.outerHTML;
                    }).join('');
                },
                set: function (value) {
                    this.childNodes = parseHTML(value)
                    //this._innerHTML = value;
                }
            });
            var attr = function(name){
                return {
                    set: function(val){
                        return this.setAttribute(name, val);
                    },
                    get: function(val){
                        return this.getAttribute(val);
                    }
                };
            };
            'href,src,alt'.split(',').forEach(function(name){
                Object.defineProperty(Node.prototype, name, attr(name));
            });

            var deCamelRegExp = /([a-z][A-Z])/g;
            var deCamel = function(text){
                return text.replace(deCamelRegExp, function(a,b,c){return b.charAt(0)+'-'+b.charAt(1).toLowerCase();});
            };
            Object.defineProperty(Node.prototype, 'outerHTML', {
                get: function () {
                    var node = this, attributes, i,
                      attributesList = this.attributes.slice();
                    if(node.nodeName === 'document' || node.nodeName === 'documentfragment'){
                        return this.innerHTML;
                    }

                    if(node.nodeType === 8){
                        return '<!--'+ node._innerText +'>';
                    }

                    if(typeof this.style === 'string'){
                        attributesList.push( { name: 'style', value: this.style } );
                    }else {
                        if( Object.keys( this.style ).length > 0 ) {
                            var style = this.style,
                              styleList = [];
                            for( i in style ) {
                                styleList.push( deCamel( i ) + ':' + style[ i ] )
                            }
                            attributesList.push( { name: 'style', value: styleList.join( ';' ) } );
                        }
                    }
                    attributes = attributesList.length?' '+attributesList.map(function(attr){
                        let val = attr.value;

                        return attr.name+(attr.quoteType !== 0 ? '='+(val.indexOf('"')>-1?'\''+val+'\'':'"'+val+'"'):'');
                    }).join(' ') : '';

                    if(node.nodeName in autoClose){
                        return '<'+node.nodeName+attributes+'>';
                    }

                    var startHTML = '<'+node.nodeName;

                    if(node.nodeName in mayClose && node.nodeName in noClose){
                        return startHTML +(attributes.length?attributes+'':' ')+ (node._selfClose?'/':'')+ '>';
                    }

                    return node.nodeName in noClose ?
                      startHTML +(attributes.length?attributes+'/':' /')+ '>':
                      startHTML +(attributes.length?attributes:'')+'>'+node.innerHTML+'</'+node.nodeName+'>';
                }
            });

            Object.defineProperty(Node.prototype, 'innerText', {
                get: function () {
                    if('_innerText' in this){
                        return this._innerText;
                    }
                },
                set: function (value) {
                    if(this.nodeType !== 3){
                        let textNode = new Node( 'TextNode' );
                        textNode.nodeType = 3;
                        textNode.innerText = value;

                        this.childNodes = [textNode];
                    }else{
                        this._innerText = value;/*
                            .replace( /&/g, "&amp;" )
                            .replace( /</g, "&lt;" )
                            .replace( />/g, "&gt;" )
                            //.replace(/"/g, "&quot;")
                            .replace( /'/g, "&#039;" );*/
                    }
                }
            });
            Object.defineProperty(Node.prototype, 'nodeValue', {
                get: function(){
                    if(this.nodeType === 3){
                        return this._innerText;
                    }else{
                        return null;
                    }
                },
                set: function(val){
                    if(this.nodeType === 3){
                        this._innerText = val;
                    }
                }
            });
            var DocumentFactory = function(val, doNotFindHTML){
                var doc = new Node('document');
                if(val){
                    doc.innerHTML = val;
                }

                var topDoc = doc;

                if(!doc.querySelector('body') || ! doc.querySelector('html')){
                    var html = new Node('html');
                    var body = new Node('body');
                    html.appendChild(new Node('head'));
                    html.appendChild(body);
                    body.childNodes = doc.childNodes;
                    doc.childNodes.forEach(function(el){
                        el.parentNode = body;
                    });
                    doc = html;

                    doc.body = doc.querySelector('body');
                }else{
                    doc = doc.querySelector( 'html' );
                }
                doc.body = doc.querySelector('body');
                doc.head = doc.querySelector('head');
                doc.documentElement = doc;

                doc.createDocumentFragment = function(arr) {
                    var fragment = new DocumentFragment();
                    if(Array.isArray(arr)) {
                        arr.forEach( function( item ) {
                            fragment.appendChild( item );
                        } );
                    }
                    return fragment;
                };
                doc.DocumentFragment = DocumentFragment;

                global.document = doc;
                doc.nodeType = 9;
                // Nothing is focused yet, and a browser reports <body> for that,
                // never null — so a consumer's `activeElement === el` check is false
                // without having to guard for undefined first.
                doc.activeElement = doc.body || null;
                doc.ownerDocument = doc;
                doc.nodeName = 'html';
                global.window = {document: doc};

                // require.extensions['.js'] = tmp;

                if(doNotFindHTML)
                    return topDoc;

                return doc;
            };
            DocumentFactory.createDocumentFragment = function(arr) {
                var fragment = new DocumentFragment();
                if(Array.isArray(arr)) {
                    arr.forEach( function( item ) {
                        fragment.appendChild( item );
                    } );
                }
                return fragment;
            };
            DocumentFactory.createElement = function(type){
                return new Node(type);
            };
            DocumentFactory.createTextNode = function(val){
                const textNode = new Node('TextNode');
                textNode.nodeType = 3;
                textNode.innerText = val;
                return textNode;
            };




            var ArraySlice = [].slice;
            var svgNS = 'http://www.w3.org/2000/svg';
            var customElementClassNameSetter = {};
            var D = {};
            D.cls = function() {
                return D._cls(arguments, [], 0);
            };
            D.Text =  DocumentFactory.createTextNode;
            D.appendChild = function(el, subEl){
                var type = typeof subEl;

                if(subEl === null){
                    return ;
                }
                var notObject = type !== 'object';
                var isHook = !notObject && ('hook' in subEl);


                if(isHook){
                    type = 'function'; notObject = true;
                }
                if( notObject ){
                    el.appendChild( D.Text( subEl ) );
                }else if('dom' in subEl){
                    subEl.dom.__cmp = subEl;
                    D.appendChild(el, subEl.dom);
                }else if( Array.isArray(subEl) ){
                    subEl.forEach(function(subEl){ D.appendChild( el, subEl ); });
                }else{
                    el.appendChild( subEl );
                }
            };
            D.join = function(arr, delimiter){
                var out = [], isFn = typeof delimiter === 'function';

                for( var i = 0, _i = arr.length - 1; i < _i; i++ ){
                    out.push(arr[i], isFn?delimiter(i):delimiter);
                }
                if(i < _i+1)
                    out.push(arr[i]);
                return out;
            };

            var dpID = 1;
            var DataPiece = function(id){this.id = id;};
            DataPiece.prototype = {value: void 0, update: function(){}};
            var DataPieceFactory = function(refs, fn, scope) {
                var id = dpID++;
                var dp = new DataPiece(id);
                refs.push(dp);
                fn.call(scope, function(val) {
                    dp.value = val;
                    dp.update();
                });
                return dp;
            };
            D._cls = function(args, refs, depth) {
                var out = [], i = 0, _i = args.length, token, tmp, key;

                for(;i<_i;i++){
                    token = args[i];
                    if(typeof token === 'string' && token){
                        out.push( token );
                    }else if(typeof token === 'object'){
                        if(token instanceof DataPiece){
                            token.value && out.push( token.value );
                        }else if ( token.hook ){
                            args[i] = DataPieceFactory(refs, token.hook, token);
                        }else if(Array.isArray(token)){
                            tmp = D._cls(token, refs, depth+1);
                            // TODO check for push tmp
                            tmp && out.push( tmp );
                        }else{
                            for(key in token){
                                if(token[key] === null)
                                    continue;
                                if(token[key] instanceof DataPiece){
                                    token[key].value && out.push(key);
                                }else if(typeof token[key] === 'function'){
                                    token[ key ] = DataPieceFactory(refs, token[ key ]);
                                }else if(typeof token[key] === 'object' && token[key].hook){
                                    token[key] = DataPieceFactory(refs, token[ key ].hook, token[key])
                                }else{
                                    token[ key ] && out.push( key );
                                }
                            }
                        }
                    }else if(typeof token === 'function'){
                        args[i] = DataPieceFactory(refs, args[i]);
                    }
                }
                return depth === 0 && refs.length ? D.__cls(args, refs): out.join(' ');
            };
            var setters = {
                cls: function(el) {
                    return function(cls) {
                        var tagName = el.tagName.toLowerCase();
                        if( tagName in customElementClassNameSetter ){
                            customElementClassNameSetter[tagName](el, cls);
                        }else{
                            el.className = D.cls.apply(D, arguments);
                        }
                    }
                },
                attr: function(el, attrName) {
                    return function(val) {
                        if(val !== void 0 && val !== false){
                            el.setAttribute( attrName, val );
                        }else{
                            el.removeAttribute(attrName)
                        }
                    }
                },
                style: function(s, styleProp) {
                    return function(val) {
                        if(val !== void 0 && val !== false){
                            s[styleProp] = val;
                        }else{
                            delete s[styleProp];
                        }
                    }
                }
            };

            var used = {
                cls: true, className: true, 'class': true, classname: true,
                attr: true, style: true, renderTo: true,
                prop: true, bind: true,
                on: true, renderto: true, el: true
            };
            // It is a simple version of the react-vanilla
            DocumentFactory.h = function(type, cfg){
                cfg = cfg || {};
                var cls = cfg.cls || cfg['class'] || cfg.className,
                  style = cfg.style,

                  attr = cfg.attr || {},
                  prop = cfg.prop,
                  on = cfg.on || {},
                  renderTo = cfg.renderTo,
                  el = cfg.el || document.createElement( type );

                var i, _i, name;

                for(i in cfg)
                    if( cfg.hasOwnProperty(i)){
                        name = i.toLowerCase();
                        if(name in used)
                            continue;

                        if(!DocumentFactory._rawEvents && name.substr(0, 2) === 'on'){
                            // it is an event
                            on[ name.substr( 2 ) ] = cfg[ i ];
                        }else{
                            // attribute
                            attr[i] = cfg[i];
                        }

                    }

                if( cls ){
                    setters.cls(el)(cls);
                }

                if( style ){
                    if(typeof style === 'string'){
                        el.style = style;
                    }else{
                        for( i in style ){
                            var s = el.style;
                            if(style.hasOwnProperty( i )){
                                if( typeof style[ i ] === 'function' ){
                                    style[ i ]( setters.style( s, i ) );
                                }else if(typeof style[ i ] === 'object'&& style[ i ] !== null && style[ i ].hook){
                                    style[ i ].hook(setters.style(s, i));
                                }else{
                                    setters.style( s, i )( style[ i ] );
                                }
                            }
                        }
                        //NS.apply( el.style, style );
                    }
                }

                for( i in attr ){
                    if(attr.hasOwnProperty( i )){
                        setters.attr( el, i )( attr[ i ] );
                    }
                }

                for( i in prop ){
                    prop.hasOwnProperty( i ) && ( el[ i ] = prop[ i ] );
                }

                for( i in on ){
                    on.hasOwnProperty( i ) && el.addEventListener( i, on[ i ] );
                }

                for( i = 2, _i = arguments.length; i < _i; i++ ){
                    var child = arguments[ i ];
                    D.appendChild( el, child );
                }

                if( renderTo ){
                    D.appendChild( renderTo, el );
                }

                return el;
            };

            return DocumentFactory;
        })();
    }else{
        doc = document;
    }
    DocumentFragment = function() {
        Node.call(this, 'DocumentFragment');
    };
    DocumentFragment.prototype = new Node('DocumentFragment');

    return doc;
})();
//var x=  module.exports('<dwadad wad ad')
//var x=  module.exports('ddd <<div a="b" b="c">abc</div>')
//var x=  module.exports('<div>abc</div>')
//console.log(x)