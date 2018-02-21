/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * *
 */
;// QUOKKA 2018
// By zibx on 2/2/18.

module.exports = (function(){
    'use strict';
    let doc;

    if(typeof document === 'undefined'){
        doc = (function(){
            const attrRegExp = /\s*([^>="'\s]+)\s*?=?\s*?(?:"([^"]*)"|'([^']*)'|([^\s>]))/g;
            let parseAttrs = function(attrs) {
                const _self = this;
                attrs.replace(attrRegExp, function(a,b,c,d) {
                    _self.setAttribute(b, c);

                });

            };
            var c = 0;
            // take any tag with arguments.
            const tagRegExp = /<(\/?!?[A-Za-z0-9_-]+)((?:\s+(?:[^>="'\s\/]+\s*(?:=\s*(?:"[^"]*"|'[^']*'|[^\s>\/]))?))*)\s*(\/?)>/;
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
                    const tagData = text.match(tagRegExp);

                    if(tagData === null){
                        chunkLength = chunkTextLength = text.length;
                    }else {
                        const tagLength = tagData[0].length,
                            tagName = tagData[1],
                            tagAttrs = tagData[2];

                        selfClosing = tagData[3];

                        if(tagName.charAt(0) !== '/'){
                            tag = new Node(tagName);
                            parseAttrs.call(tag, tagAttrs)
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
                        } else if (closingTag === stack[stack.length - 2].nodeName) {
                            stack.pop();
                            stack.pop();
                            root = stack[stack.length - 1];
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
                contains: function(name) {
                    return regExp(name).test(this._node.className);
                }
            };

            const Node = function(type){
                this.nodeName = type.toLowerCase();
                this.childNodes = [];
                this.attributes = [];

                this.classList = new ClassList(this);
                this._listeners = {};
            };
            var Attribute = function(key, value){
                this.name = key;
                this.value = value;
            };

            var slice = Array.prototype.slice;
            Node.prototype = {
                addEventListener: function(evtName, fn){
                    (this._listeners[evtName] || (this._listeners[evtName] = [])).push(fn);
                },
                emit: function(evtName){
                    var _self = this, args = slice.call(arguments,1);
                    (this._listeners[evtName] || []).forEach(function(fn){
                        fn.apply(_self, args);
                    });
                },
                appendChild: function(child){
                    this.childNodes.push(child);
                    child.parentNode = this;
                },
                removeChild: function(child){
                    const index = this.childNodes.indexOf(child);
                    child.parentNode = null;
                    this.childNodes.splice(index, 1);
                },
                setAttribute: function(k, v){
                    const attr = new Attribute(k, v);
                    this.attributes[k] = attr;
                    this.attributes.push(attr);

                },
                getAttribute: function(k){
                    return (this.attributes[k] || {}).value;
                },
                createElement: function(type){
                    return new Node(type);
                },
                createTextNode: function(val){
                    const textNode = new Node('textnode');
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
                nodeType: 1
            };

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
            const noClose = {
                br: 1,
                hr: 1,
                img: 1,
                meta: 1,
                link: 1
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
                        return node.nodeName === 'textnode' ? node.innerText : node.outerHTML;
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

            Object.defineProperty(Node.prototype, 'outerHTML', {
                get: function () {
                    var node = this, attributes, i;
                    /*for( i in this.attributes )
                        attributes.push({name: i, val: i+'="'+this.getAttribute(i)+'"'});
                    attributes.sort(function(a, b){
                        return a.name < b.name ? -1 : 1;
                    });
                    attributes = attributes.map(function(attr){
                        return attr.val;
                    });*/
                    attributes = this.attributes.length?' '+this.attributes.map(function(attr){
                            let val = attr.value;

                            return attr.name+(val?'='+(val.indexOf('"')>-1?'\''+val+'\'':'"'+val+'"'):'');
                        }).join(' ') : '';

                    return noClose[node.nodeName] ? '<'+node.nodeName+(attributes.length?attributes+'/':' /')+'>': '<'+node.nodeName+(attributes.length?attributes:'')+'>'+node.innerHTML+'</'+node.nodeName+'>';
                }
            });

            Object.defineProperty(Node.prototype, 'innerText', {
                get: function () {
                    if('_innerText' in this){
                        return this._innerText;
                    }
                },
                set: function (value) {
                    this._innerText = value
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        //.replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                }
            });
            return function(val){
                var doc = new Node('document');
                if(val){
                    doc.innerHTML = val;
                }


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
                    doc = doc.querySelector('html');
                }
                doc.body = doc.querySelector('body');
                doc.head = doc.querySelector('head');
                doc.documentElement = doc;

                global.document = doc;
                doc.nodeType = 9;
                doc.ownerDocument = doc;
                doc.nodeName = 'html';
                global.window = {document: doc};

                // require.extensions['.js'] = tmp;

                return doc;
            };
            /*
            return {
                createElement: function(type){
                    return new Node(type);
                },
                createTextNode: function(val){
                    var textNode = new Node('TextNode');
                    textNode.innerText = val;
                    return textNode;
                }
            };*/
        })();
    }else{
        doc = document;
    }
    return doc;
})();
//var x=  module.exports('<dwadad wad ad')
//var x=  module.exports('ddd <<div a="b" b="c">abc</div>')
//var x=  module.exports('<div>abc</div>')
//console.log(x)