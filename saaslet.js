(function(){

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
            this.iFrame.frameBorder = 0;
            this.iFrame.allowTransparency = true;
            this.iFrame.src = iFrameUrl;
            this.origin = iFrameUrl.match( /^.+\:\/\/[^\/]+\// )[ 0 ] ;
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
            this.iFrame.width = width;
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
     */
    class Saaslet{

        /**
         * @constructor
         * @param {String} publicAppKey a public app key. You can find yours after creating an app on the Saaslet dashboard
         */
        constructor( publicAppKey ) {
            this.publicAppKey = publicAppKey;
            this.activeWidgets = {};
            this.widgetCount = 0;
            this.baseUrl = 'http://devapp.saaslet.com:8080'; //https://saaslet.com/widgets
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
            const url = this.baseUrl + `?widgetId=${widgetId}&standalone=true&name=${widgetName}&appKey=${this.publicAppKey}`;
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
        
        getUserProfile() {

        }

        login( loginData ) {

        }

        logout() {

        }

        createUser() {

        }

        setUserSetting( key, value ) {

        }

        getUserSetting( key ) {

        }

        deleteUserSetting( key ) {

        }
    }

    function get( url, callback ) {
        sendRequest( url, callback );
    }

    function post( url, data, callback ) {
        sendRequest( url, callback, JSON.stringify( data ) );
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
    

    function sendRequest(url,callback,postData) {
        var req = createXMLHTTPObject();
        if (!req) return;
        var method = (postData) ? "POST" : "GET";

        req.withCredentials = true;
        req.open(method,url,true);

        if (postData)
            req.setRequestHeader('Content-type','application/json');
            req.onreadystatechange = function () {
                if (req.readyState != 4) return;
                if (req.status != 200 && req.status != 304) {
                    return;
                }
                callback(req);
            }
        if (req.readyState == 4) return;
        req.send(postData);
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