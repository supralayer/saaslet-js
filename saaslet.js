(function(){

    /**
     * Event Emitter
     */
    class EventEmitter{
        constructor() {
            this.listener = {};
        }
    
        on( eventName, fn, context, order ) {
            if( !this.listener[ eventName ] ) {
                this.listener[ eventName ] = [];
            }
    
            this.listener[ eventName ].push({
                eventName: eventName,
                fn,
                context: context,
                order: order
            });
    
            this.listener[ eventName ].sort((a,b) => {
                return a.order > b.order ? 1 : -1;
            });
        }
    
        off( eventName, fn, context ) {
            if( !this.listener[ eventName ] ) {
                return;
            }
    
            var i = this.listener[ eventName ].length;
    
            while( i-- ) {
                if( 
                    this.listener[ eventName ][ i ].fn === fn &&
                    this.listener[ eventName ][ i ].context === context
                ) {
                    this.listener[ eventName ].splice( i, 1 );
                }
            }
    
            if( this.listener[ eventName ].length === 0 ) {
                delete this.listener[ eventName ];
            }
        }
    
        emit( eventName ) {
            if( !this.listener[ eventName ] ) {
                return;
            }
    
            const args = Array.prototype.slice.call( arguments, 1 );
    
    
            var last = null;
            var i = 0;
            while( this.listener[ eventName ] && this.listener[ eventName ][ i ] ) {
                last = this.listener[ eventName ][ i ];
                if( this.listener[ eventName ][ i ].fn.apply( this.listener[ eventName ][ i ].context, args ) === false ) {
                    return;   
                }
                if( this.listener[ eventName ] && this.listener[ eventName ][ i ] === last ) {
                    i++;
                }
            }
        }
    
        hasListeners( eventName ) {
            return this.listener[ eventName ] && this.listener[ eventName ].length > 0;
        }
    }
    /**
     * @class Widget
     * 
     * Represents a single Saaslet instance within a user's app, e.g. a login/signup form
     * or a payment details form.
     * 
     * This instance offers methods to directly manipulate and interact with the widget
     */
    class Widget{

        /**
         * @constructor
         * @param {String} id an internal widget id, used to route post messages 
         * @param {String} name  the saaslet name, e.g. login-signup
         * @param {DOMElement} parentElement the element to which the widget should be mounted
         * @param {String} iFrameUrl a url with get parameters used to load the widget within an inframe
         * @param {Saaslet} parent the instance of Saaslet that created this widget
         */
        constructor( id, name, parentElement, iFrameUrl, parent ) {
            this.id = id;
            this.name = name;
            this.parentElement = parentElement;
            this.parent = parent;
            this.iFrame = document.createElement( 'iframe' );
            this.iFrame.style.display = 'block';
            this.iFrame.frameBorder = 0;
            this.iFrame.allowTransparency = true;
            this.iFrame.src = iFrameUrl;
            this.origin = this.iFrame.src.match( /^.+\:\/\/[^\/]+\// )[ 0 ] ;
            this.parentElement.appendChild( this.iFrame );
        }

        /**
         * Update the widget's configuration at runtime. This method can
         * take a delta of the full configuration, e.g. just { loginButtonText: 'log in now' }
         * and merge it into the widget's configuration.
         * 
         * @param {Object} config
         * @returns {undefined}
         */
        setConfig( config ) {
            this._sendMessage( 'setConfig', config );
        }

        /**
         * Updates the widget's css at runtime. Please note, CSS files are always appended. So new
         * rules overwrite previously configured rules, but other rules will be kept
         * 
         * @param {String} css
         * @returns {undefined}
         */
        setCss( css ) {
            this._sendMessage( 'setCss', css );
        }

        /**
         * Removes the widget from the DOM and cleans up internal references
         * 
         * @returns {undefined}
         */
        destroy() {
            this.iFrame.remove();
            this.parent._removeWidget( this.id );
        }

        /**
         * Adjusts the size of the iFrame containing the widget to the provided width and height.
         * 
         * Please note: This does not affect the size of the widget itself. To change the widget's dimension
         * please use CSS.
         * 
         * Please also note: Upon initialisation the widget within the iframe itself measures itself and calls to the 
         * parent to apply its size (plus a bit of margin) to the iframe it resides within.
         * 
         * @param {Number} width 
         * @param {Number} height 
         * @returns {undefined}
         */
        setSize( width, height ) {
            this.iFrame.width = Math.max( this.parentElement.offsetWidth, width );
            this.iFrame.height = height;
        }

        /**
         * Safely sends a message to the child widget via postmessage
         * 
         * @private
         * 
         * @param {String} action 
         * @param {Mixed} data 
         * 
         * @returns {undefined}
         */
        _sendMessage( action, data ) {
            this.iFrame.contentWindow.postMessage({
                source: 'saaslet-parent',
                action: action,
                data: data
            }, this.origin );
        }
    }

    /**
     * @class Saaslet
     * 
     * The main class exposed by this script. Acts as a factory for widgets 
     * and as a client to the Saaslet HTTP API.
     * 
     * @class Saaslet
     * @extends EventEmitter
     */
    class Saaslet extends EventEmitter{

        /**
         * @constructor
         * @param {String} appPublishableKey a public app key. You can find yours after creating an app on the Saaslet dashboard
         */
        constructor( appPublishableKey ) {
            super();
            this.appPublishableKey = appPublishableKey;
            this.activeWidgets = {};
            this.widgetCount = 0;
            this.baseUrl = 'http://devapp.saaslet.com:8080/';// 'https://saaslet.com/widgets/';
            this.apiUrl = 'https://api.saaslet.com/';
            this.user = new User( this.apiUrl, this.appPublishableKey, this );
            window.addEventListener( 'message', this._onWidgetMessage.bind( this ) );
        }
        
        /**
         * Creates a new Saaslet (Widget) within a provided parent element.
         * 
         * This method returns a promise that will resolve with a widget instance once the widget is fully loaded
         * 
         * @param {String} widgetName the name of the saaslet to be created, e.g. 'signup-login'
         * @param {String|Element} elementOrSelector A DOM selector string or a DOM element the widget will be mounted into
         * @param {Object} [widgetConfig] an optional configuration object that overrides part of the default configuration for this widget
         * @param {String} [widgetCss] an optional CSS String that will be injected into the widget
         * 
         * @returns {Promise} a promise that will resolve with the widget once its fully loaded
         */
        createWidget( widgetName, elementOrSelector, widgetConfig, widgetCss ) {
            const promise = getPromise();
            const element = this._resolveElement( elementOrSelector );
            const widgetId = 'wid_' + this.widgetCount;
            const url = this.baseUrl + `?widgetId=${widgetId}&standalone=true&name=${widgetName}&appKey=${this.appPublishableKey}`;
            const widget = new Widget( widgetId, widgetName, element, url, this );

            this.widgetCount++;
            this.activeWidgets[ widgetId ] = widget;

            widget.iFrame.addEventListener( 'load', () => {
                if( widgetConfig ) {
                    widget.setConfig( widgetConfig );
                }
                
                if( widgetCss ) {
                    widget.setCss( widgetCss );
                }

                promise.resolve( widget );
            }, true );

            return promise;
        }

        _resolveElement( elementOrSelector ) {
            if( typeof elementOrSelector === 'string' ) {
                elementOrSelector = document.querySelector( elementOrSelector );
            }

            if( !elementOrSelector ) {
                throw new Error( 'Element ' + elementOrSelector + ' not found' );
            }

            return elementOrSelector;
        }

        _removeWidget( id ) {
            delete this.activeWidgets[ id ];
        }

        _onWidgetMessage( msg ) {
            if( msg.data.source !== 'saaslet-widget' ) {
                return;
            }
            
            if( msg.data.action === 'resize' ) {
                this.activeWidgets[ msg.data.widgetId ].setSize( msg.data.data.width, msg.data.data.height );
            }
        }

        _sendMessageToWidget( widgetId, action, data ) {
            this.activeWidgets[ widgetId ].contentWindow.postMessage({
                source: 'saaslet-parent',
                action: action,
                data: data
            }, this.baseUrl);
        }
    }

    class User{
        constructor( apiUrl, appPublishableKey, parent ) {
            this.apiUrl = apiUrl;
            this.appPublishableKey = appPublishableKey;
            this.parent = parent;
        }

        signup( email, password ) {
            const data = { 
                email: email,
                password: password,
                appPublishableKey: this.appPublishableKey
            }

            return post( this.apiUrl + 'users/signup', data, d => {
                this.parent.emit( 'signup' );
                return d.data.userId;
            });
        }

        login( email, password ) {
            const data = { 
                email: email,
                password: password,
                appPublishableKey: this.appPublishableKey
            }

            return post( this.apiUrl + 'users/login', data, d => {
                this.parent.emit( 'login' );
                return d;
            });
        }

        logout() {
            return post( this.apiUrl + 'users/logout', {}, d => {
                this.parent.emit( 'logout' );
                return d;
            });
        }

        set( key, value ) {
            return post( this.apiUrl + 'users/data', { data: { [ key ]: value } } );
        }

        get( key ) {
            return get( this.apiUrl + 'users/data', d => {
                return d.data.user.data[ key ];
            })
        }

        getAll() {
            return get( this.apiUrl + 'users/data', d => {
                return d.data.user.data;
            })
        }

        isLoggedIn() {
            return new Promise(( resolve, reject ) => {
                get( this.apiUrl + 'users/data').then(() => {
                    resolve( true );
                })
                .catch( e => {
                    resolve( false );
                });
            }); 
        }

        getInfo() {
            return get( this.apiUrl + 'users/data', d => {
                return {
                    id: d.data.user.id,
                    email: d.data.user.email.address,
                    subscriptions: d.data.user.subscriptions || []
                }
            })
        }

        changeEmail( email, password ) {
            return post( this.apiUrl + 'users/email/change', { email: email, password: password } );
        }

        changePassword( oldPassword, newPassword ) {
            return post( this.apiUrl + 'users/password/change', { oldPassword: oldPassword, newPassword: newPassword } );
        }
    }

    class Plan{
        constructor( apiUrl ) {
            this.apiUrl = apiUrl;
        }


    }
    function get( url, transformFn ) {
        return sendRequest( url, null, transformFn );
    }

    function post( url, data, transformFn ) {
        return sendRequest( url, JSON.stringify( data ), transformFn );
    }

    function getPromise() {
        var doResolve, doReject;
        var promise = new Promise(function(resolve, reject) {
            doResolve = resolve;
            doReject = reject;
        });
    
        promise.resolve = doResolve;
        promise.reject = doReject;

        return promise;
    }
    

    function sendRequest( url, postData, transformFn ) {
        const req = createXMLHTTPObject();
        const promise = getPromise();
        const method = postData ? "POST" : "GET";

        if( !req ) {
            promise.reject( 'Could not create XMLHTTPObject' );
            return;
        }
        
        req.withCredentials = true;
        req.open( method, url, true );
        req.setRequestHeader('Content-type','application/json');
        req.onreadystatechange = function () {
            if( req.readyState !== 4 ) { 
                return;
            }
            var responseData = {
                status: req.status,
                data: JSON.parse( req.responseText )
            };

            if ( req.status != 200 && req.status != 304 ) {
                promise.reject( responseData );
            } else {
                if( transformFn ) {
                    responseData = transformFn( responseData );
                }
                promise.resolve( responseData );
            }
        }
        if (req.readyState == 4) return;
        req.send(postData);

        return promise;
    }
    
    var XMLHttpFactories = [
        function () {return new XMLHttpRequest()},
        function () {return new ActiveXObject("Msxml3.XMLHTTP")},
        function () {return new ActiveXObject("Msxml2.XMLHTTP.6.0")},
        function () {return new ActiveXObject("Msxml2.XMLHTTP.3.0")},
        function () {return new ActiveXObject("Msxml2.XMLHTTP")},
        function () {return new ActiveXObject("Microsoft.XMLHTTP")}
    ];
    
    function createXMLHTTPObject() {
        var xmlhttp = false;
        for (var i=0;i<XMLHttpFactories.length;i++) {
            try {
                xmlhttp = XMLHttpFactories[i]();
            }
            catch (e) {
                continue;
            }
            break;
        }
        return xmlhttp;
    }
    
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = Saaslet;
    } else if (typeof define === 'function' && define.amd) {
        define([], function() {
            return Saaslet;
        });
    }
    else {
        window.Saaslet = Saaslet;
    }

    
    
})();