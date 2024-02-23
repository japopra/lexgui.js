import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.components.push( 'Graph' );

function flushCss(element) {
    // By reading the offsetHeight property, we are forcing
    // the browser to flush the pending CSS changes (which it
    // does to ensure the value obtained is accurate).
    element.offsetHeight;
}

function swapElements (obj, a, b) {
    [obj[a], obj[b]] = [obj[b], obj[a]];
}

function swapArrayElements (array, id0, id1) {
    [array[id0], array[id1]] = [array[id1], array[id0]];
};

function sliceChar(str, idx) {
    return str.substr(0, idx) + str.substr(idx + 1);
}

function firstNonspaceIndex(str) {
    return str.search(/\S|$/);
}

function deleteElement( el ) {
    if( el ) el.remove();
}

let ASYNC_ENABLED = true;

function doAsync( fn, ms ) {
    if( ASYNC_ENABLED )
        setTimeout( fn, ms ?? 0 );
    else
        fn();
}

/**
 * @class GraphEditor
 */

class GraphEditor {

    static __instances  = [];

    // Editor

    static MIN_SCALE            = 0.25;
    static MAX_SCALE            = 4.0;

    static EVENT_MOUSEMOVE      = 0;
    static EVENT_MOUSEWHEEL     = 1;

    // Node Drawing

    static NODE_IO_INPUT        = 0;
    static NODE_IO_OUTPUT       = 1;


    static NODE_TYPES           = { };

    /**
     * @param {*} options
     * 
     */

    constructor( area, options = {} ) {

        GraphEditor.__instances.push( this );

        this.base_area = area;
        this.area = new LX.Area( { className: "lexgraph" } );

        area.root.classList.add( 'grapharea' );

        this.root = this.area.root;
        this.root.tabIndex = -1;
        area.attach( this.root );

        // Bind resize

        area.onresize = ( bb ) => {
            
        };

        this.root.addEventListener( 'keydown', this._processKey.bind( this ), true );
        this.root.addEventListener( 'keyup', this._processKeyUp.bind( this ), true );
        this.root.addEventListener( 'mousedown', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mouseup', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mousemove', this._processMouse.bind( this ) );
        this.root.addEventListener( 'mousewheel', this._processMouse.bind(this) );
        this.root.addEventListener( 'mouseleave', this._processMouse.bind(this) );
        this.root.addEventListener( 'click', this._processMouse.bind( this ) );
        this.root.addEventListener( 'contextmenu', this._processMouse.bind( this ) );
        this.root.addEventListener( 'focus', this._processFocus.bind( this, true) );
        this.root.addEventListener( 'focusout', this._processFocus.bind( this, false ) );

        this.propertiesDialog = new LX.Dialog( "Properties", null, { position: [ "12px", "12px" ] });

        // Move to root..
        this.root.appendChild( this.propertiesDialog.root );

        this._lastMousePosition = new LX.vec2( 0, 0 );

        this._undoSteps = [ ];
        this._redoSteps = [ ];

        this.keys = { };

        // Nodes and connections

        this.nodes      = { };
        this.links      = { };
        this.variables  = { };

        this.selectedNodes = [ ];

        this._nodeBackgroundOpacity = options.disableNodeOpacity ? 1.0 : 0.8;

        this.main = null;

        // Back pattern
        
        const f = 15.0;
        this._patternPosition = new LX.vec2( 0, 0 );
        this._patternSize = new LX.vec2( f );
        this._circlePatternSize = f * 0.04;
        this._circlePatternColor = '#71717a9c';

        this._generatePattern();

        // Renderer state

        this._scale = 1.0;

        // Link container

        this._domLinks = document.createElement( 'div' );
        this._domLinks.classList.add( 'lexgraphlinks' );
        this.root.appendChild( this._domLinks );

        // Node container

        this._domNodes = document.createElement( 'div' );
        this._domNodes.classList.add( 'lexgraphnodes' );
        this.root.appendChild( this._domNodes );

        window.ge = this;

        this.start();
    }

    static getInstances() {

        return GraphEditor.__instances;
    }

    /**
     * Register a node class so it can be listed when the user wants to create a new one
     * @method registerCustomNode
     * @param {String} type: name of the node and path
     * @param {Class} baseClass class containing the structure of the custom node
     */

    static registerCustomNode( type, baseClass ) {
        
        if ( !baseClass.prototype ) {
            throw "Cannot register a simple object, it must be a class with a prototype!";
        }
        baseClass.type = type;

        const className = baseClass.name;

        // Get category from path
        const pos = type.lastIndexOf( "/" );
        baseClass.category = type.substring( 0, pos );

        if ( !baseClass.title ) {
            baseClass.title = className;
        }

        // Extend GraphNode class
        const ownPropertyNames = Object.getOwnPropertyNames( GraphNode.prototype );
        for ( var k of ownPropertyNames ) {
            if ( !baseClass.prototype[ k ] ) {
                baseClass.prototype[ k ] = GraphNode.prototype[ k ];
            }
        }

        baseClass.prototype[ 'inputs' ] = [ ];
        baseClass.prototype[ 'outputs' ] = [ ];
        baseClass.prototype[ 'properties' ] = [ ];

        if( !baseClass.prototype.onExecute )
        {
            console.warn( `GraphNode [${ this.name }] does not have a callback attached.` );
        }

        const prev = GraphEditor.NODE_TYPES[ type ];
        if(prev) {
            console.warn( `Replacing node type [${ type }]` );
        }

        GraphEditor.NODE_TYPES[ type ] = baseClass;

        // Some callbacks..

        if ( this.onNodeTypeRegistered ) {
            this.onCustomNodeRegistered( type, baseClass);
        }

        if ( prev && this.onNodeTypeReplaced ) {
            this.onNodeTypeReplaced( type, baseClass, prev );
        }
    }

    /**
     * Create a node of a given type with a name. The node is not attached to any graph yet.
     * @method createNode
     * @param {String} type full name of the node class. p.e. "math/sin"
     * @param {String} title a name to distinguish from other nodes
     * @param {Object} options Store node options
     */

    static addNode( type, title, options ) {

        var baseClass = GraphEditor.NODE_TYPES[ type ];

        if (!baseClass) {
            console.warn( `GraphNode type [${ type }] not registered.` );
            return null;
        }

        title = title ?? baseClass.title;

        const node = new baseClass( title );

        node.type = type;
        node.title = title;
        node.position = new LX.vec2( 0, 0 );
        node.color = null;

        // Extra options
        if ( options ) {
            for (var i in options) {
                node[ i ] = options[ i ];
            }
        }

        if ( node.onNodeCreated ) {
            node.onNodeCreated();
        }
        
        return node;
    }

    /**
     * @method setGraph
     * @param {Graph} graph
     */

    setGraph( graph ) {

        this.graph = graph;

        if( !this.graph.nodes )
        {
            console.warn( 'Graph does not contain any node!' );
            return ;
        }

        this.nodes = { };

        for( let node of this.graph.nodes )
        {
            this._createNodeDOM( node );
        }
    }

    /**
     * @method clear
     */

    clear() {

        this._domNodes.innerHTML = "";
        this._domLinks.innerHTML = "";
    }

    setVariable( name, value ) {

        this.variables[ name ] = value;
    }

    getVariable( name ) {

        return this.variables[ name ];
    }

    propagateEventToAllNodes( eventName, params ) {

        for ( let node of this.nodes )
        {
            if( !node.data[ eventName ] )
                continue;

            node.data[ eventName ]( params );
        }
    };

    /**
     * @method unSelectAll
     */

    unSelectAll() {

        this._domNodes.querySelectorAll( '.lexgraphnode' ).forEach( v => v.classList.remove( 'selected' ) );

        this.selectedNodes.length = 0;

        // TODO
        // hide this.propertiesDialog
    }

    _createNodeDOM( node ) {

        node.graph = this;

        var nodeContainer = document.createElement( 'div' );
        nodeContainer.classList.add( 'lexgraphnode' );
        nodeContainer.style.left = "0";
        nodeContainer.style.top = "0";
        
        this._translateNode( nodeContainer, node.position.x, node.position.y );

        var color;

        // Get color from type if color if not manually specified
        if( node.type && GraphEditor.NODE_TYPES[ node.type ] )
        {
            color = GraphEditor.NODE_TYPES[ node.type ].color;
            nodeContainer.classList.add( node.type ); // Support adding color from css..
        }

        // Update with manual color

        color = node.color ?? color;

        if( color )
        {
            // RGB
            if( color.constructor == Array )
            {
                color = color.join( ',' );
            }
            // Hex color..
            else
            {
                color = LX.hexToRgb( color );
                color.forEach( ( v, i ) => color[ i ] = v * 255 );
            }

            nodeContainer.style.backgroundColor = "rgba(" + color + ", " + this._nodeBackgroundOpacity + ")";
        }

        nodeContainer.addEventListener( 'mousedown', e => {

            // Only for left click..
            if( e.button != LX.MOUSE_LEFT_CLICK )
                return;

            if( this.selectedNodes.length > 1 )
            {
                this.unSelectAll();
            }

            if( !nodeContainer.classList.contains( 'selected' ) )
            {
                this._selectNode( nodeContainer, e.shiftKey );
            }
        } );

        nodeContainer.addEventListener( 'dblclick', e => {

            // Only for left click..
            if( e.button != LX.MOUSE_LEFT_CLICK )
                return;

            var panel = this.propertiesDialog.panel;
            panel.clear();

            for( let p of node.properties )
            {
                switch( p.type )
                {
                case 'float':
                case 'int':
                    panel.addNumber( p.name, p.value, (v) => { p.value = v } );
                    break;
                case 'string':
                    panel.addText( p.name, p.value, (v) => { p.value = v } );
                break;
                }
            }

        } );

        // Title header
        var nodeHeader = document.createElement( 'div' );
        nodeHeader.classList.add( 'lexgraphnodeheader' );
        nodeHeader.innerText = node.title;
        nodeContainer.appendChild( nodeHeader );

        // Properties
        // if( node.properties.length  )
        // {
        //     var nodeProperties = document.createElement( 'div' );
        //     nodeProperties.classList.add( 'lexgraphnodeproperties' );
            
        //     for( let p of node.properties )
        //     {
        //         var panel = new LX.Panel();
    
        //         p.signal = "@" + LX.UTILS.uidGenerator() + node.title;

        //         switch( p.type )
        //         {
        //         case 'float':
        //         case 'int':
        //             panel.addNumber( p.name, p.value, (v) => p.value = v, { signal: p.signal } );
        //             break;
        //         case 'string':
        //             panel.addText( p.name, p.value, (v) => p.value = v, { signal: p.signal } );
        //         break;
        //         }

        //         // var prop = document.createElement( 'div' );
        //         // prop.innerText = p.type;
        //         // prop.classList.add( 'lexgraphnodeproperty' );
        //         nodeProperties.appendChild( panel.root );
        //     }
    
        //     nodeContainer.appendChild( nodeProperties );
        // }

        // Inputs and outputs
        var nodeIO = document.createElement( 'div' );
        nodeIO.classList.add( 'lexgraphnodeios' );
        nodeContainer.appendChild( nodeIO );

        const hasInputs = node.inputs && node.inputs.length;
        const hasOutputs = node.outputs && node.outputs.length;

        // Inputs
        {
            var nodeInputs = null;

            if( node.inputs && node.inputs.length )
            {
                nodeInputs = document.createElement( 'div' );
                nodeInputs.classList.add( 'lexgraphnodeinputs' );
                nodeInputs.style.width = hasOutputs ? "50%" : "100%";
                nodeIO.appendChild( nodeInputs );
            }

            for( let i of node.inputs )
            {
                if( !i.type )
                {
                    console.warn( `Missing type for node [${ node.title }], skipping...` );
                    continue;
                }

                var input = document.createElement( 'div' );
                input.className = 'lexgraphnodeio ioinput';
                input.dataset[ 'index' ] = nodeInputs.childElementCount;

                var type = document.createElement( 'span' );
                type.className = 'io__type input ' + i.type;
                type.innerHTML = '<span>' + i.type[ 0 ].toUpperCase() + '</span>';
                input.appendChild( type );

                if( i.name )
                {
                    var name = document.createElement( 'span' );
                    name.classList.add( 'io__name' );
                    name.innerText = i.name;
                    input.appendChild( name );
                }

                nodeInputs.appendChild( input );
            }
        }

        // Outputs
        {
            var nodeOutputs = null;

            if( node.outputs && node.outputs.length )
            {
                nodeOutputs = document.createElement( 'div' );
                nodeOutputs.classList.add( 'lexgraphnodeoutputs' );
                nodeOutputs.style.width = hasInputs ? "50%" : "100%";
                nodeIO.appendChild( nodeOutputs );
            }

            for( let o of node.outputs )
            {
                if( !o.type  )
                {
                    console.warn( `Missing type for node [${ node.title }], skipping...` );
                }

                var output = document.createElement( 'div' );
                output.className = 'lexgraphnodeio iooutput';
                output.dataset[ 'index' ] = nodeOutputs.childElementCount;

                if( o.name )
                {
                    var name = document.createElement( 'span' );
                    name.classList.add( 'io__name' );
                    name.innerText = o.name;
                    output.appendChild( name );
                }

                var type = document.createElement( 'span' );
                type.className = 'io__type output ' + o.type;
                type.innerHTML = '<span>' + o.type[ 0 ].toUpperCase() + '</span>';
                output.appendChild( type );

                nodeOutputs.appendChild( output );
            }
        }

        // Move nodes

        LX.makeDraggable( nodeContainer, { onMove: this._onMoveNode.bind( this ) } );

        // Manage links

        nodeIO.querySelectorAll( '.lexgraphnodeio' ).forEach( el => {

            el.addEventListener( 'mousedown', e => {

                // Only for left click..
                if( e.button != LX.MOUSE_LEFT_CLICK )
                    return;

                this.lastMouseDown = LX.getTime();
    
                this._generatingLink = {
                    index: parseInt( el.dataset[ 'index' ] ),
                    io: el,
                    ioType: el.classList.contains( 'ioinput' ) ? GraphEditor.NODE_IO_INPUT : GraphEditor.NODE_IO_OUTPUT,
                    domEl: nodeContainer
                };

                e.stopPropagation();
                e.stopImmediatePropagation();
            } );

            el.addEventListener( 'mouseup', e => {

                // Single click..
                if( ( LX.getTime() - this.lastMouseDown ) < 120 ) {
                    delete this._generatingLink;
                    return;
                }

                if( this._generatingLink )
                {
                    // Check for IO
                    if( !this._onLink( e ) )
                    {
                        // Delete entire SVG if not a successful connection..
                        deleteElement( this._generatingLink.path ? this._generatingLink.path.parentElement : null );
                    }

                    delete this._generatingLink;
                }

                e.stopPropagation();
                e.stopImmediatePropagation();
            } );

            el.addEventListener( 'click', e => {

                if( !el.links )
                    return;

                const nodeId = nodeContainer.dataset[ 'id' ];

                this._deleteLinks( nodeId, el );
            } );

        } );

        const id = node.title.toLowerCase().replaceAll( /\s/g, '-' ) + '-' + LX.UTILS.uidGenerator();
        this.nodes[ id ] = { data: node, dom: nodeContainer };
        
        node.id = id;
        nodeContainer.dataset[ 'id' ] = id;

        this._domNodes.appendChild( nodeContainer );

        // Only 1 main per graph!
        if( node.title == 'Main' )
        {
            this.main = nodeContainer;
        }

        return nodeContainer;
    }

    _onMoveNode( e ) {
        
        for( let nodeId of this.selectedNodes )
        {
            const el = this._getNodeDOMElement( nodeId );

            const dT = this._deltaMousePosition.div( this._scale );

            this._translateNode( el, dT.x, dT.y );

            this._updateNodeLinks( nodeId );
        }
    }

    _selectNode( dom, multiSelection, forceOrder = true ) {

        if( !multiSelection )
            this.unSelectAll();

        dom.classList.add( 'selected' );

        this.selectedNodes.push( dom.dataset[ 'id' ] );

        if( forceOrder )
        {
            // Reorder nodes to draw on top..
            this._domNodes.appendChild( dom );
        }
    }

    _unSelectNode( dom ) {

        dom.classList.remove( 'selected' );

        // Delete from selected..
        const idx = this.selectedNodes.indexOf( dom.dataset[ 'id' ] );
        this.selectedNodes.splice( idx, 1 );
    }

    _translateNode( dom, x, y ) {

        dom.style.left = ( parseFloat( dom.style.left ) + x ) + "px";
        dom.style.top = ( parseFloat( dom.style.top ) + y ) + "px";
    }

    _deleteNode( nodeId ) {

        const el = this._getNodeDOMElement( nodeId );

        console.assert( el );

        deleteElement( el );

        delete this.nodes[ nodeId ];

        // Delete connected links..
        
        for( let key in this.links )
        {
            if( !key.includes( nodeId ) )
                continue;

            const aIdx = key.indexOf( '@' );
            const targetIsInput = key.substring( aIdx + 1 ) != nodeId;

            // Remove the connection from the other before deleting..

            const numLinks = this.links[ key ].length;

            for( var i = 0; i < numLinks; ++i )
            {
                var link = this.links[ key ][ i ];

                deleteElement( link.path.parentElement );

                const targetNodeId = targetIsInput ? link.inputNode : link.outputNode;

                const targetNodeDOM = this._getNodeDOMElement( targetNodeId );
                const ios = targetNodeDOM.querySelector( targetIsInput ? '.lexgraphnodeinputs' : '.lexgraphnodeoutputs' );
                const io = ios.childNodes[ targetIsInput ? link.inputIdx : link.outputIdx ];

                const ioIndex = targetIsInput ? link.outputIdx : link.inputIdx;
                const nodelinkidx = io.links[ ioIndex ].indexOf( nodeId );
                io.links[ ioIndex ].splice( nodelinkidx, 1 );
            }

            delete this.links[ key ];
        }
    }

    // This is in pattern space!
    _getNodePosition( dom ) {

        return new LX.vec2( parseFloat( dom.style.left ), parseFloat( dom.style.top ) );
    }

    _getNodeDOMElement( nodeId ) {

        return this.nodes[ nodeId ] ? this.nodes[ nodeId ].dom : null;
    }

    _getLinks( nodeSrcId, nodeDstId ) {

        const str = nodeSrcId + '@' + nodeDstId;
        return this.links[ str ];
    }

    _deleteLinks( nodeId, io ) {

        const isInput = io.classList.contains( 'ioinput' );
        const srcIndex = parseInt( io.dataset[ 'index' ] );

        if( isInput ) // Only one "link to output" to delete
        {
            let targetIndex;

            const targets = io.links.filter( (v, i) => { targetIndex = i; return v !== undefined; } )[ 0 ];
            const targetId = targets[ 0 ];

            var links = this._getLinks( targetId, nodeId );

            var linkIdx = links.findIndex( i => ( i.inputIdx == srcIndex && i.outputIdx == targetIndex ) );
            deleteElement( links[ linkIdx ].path.parentElement );
            links.splice( linkIdx, 1 );

            // Input has no longer any connected link

            delete io.links;
            delete io.dataset[ 'active' ];

            // Remove a connection from the target connections

            const targetDOM = this._getNodeDOMElement( targetId );
            const ios = targetDOM.querySelector( '.lexgraphnodeoutputs' );
            const targetIO = ios.childNodes[ targetIndex ];

            const idx = targetIO.links[ srcIndex ].findIndex( v => v == nodeId );
            targetIO.links[ srcIndex ].splice( idx, 1 );

            // No links left..
            if( !targetIO.links.reduce( c => c !== undefined, 0 ) ) {
                delete targetIO.links;
                delete targetIO.dataset[ 'active' ];
            }
        }
        else // Delete ALL "to input links"
        {

            const numLinks = io.links.length;

            for( let targetIndex = 0; targetIndex < numLinks; ++targetIndex )
            {
                const targets = io.links[ targetIndex ];

                if( !targets )
                    continue;

                for( let it = ( targets.length - 1 ); it >= 0 ; --it )
                {
                    const targetId = targets[ it ];
                    var links = this._getLinks( nodeId, targetId );

                    var linkIdx = links.findIndex( i => ( i.inputIdx == targetIndex && i.outputIdx == srcIndex ) );
                    deleteElement( links[ linkIdx ].path.parentElement );
                    links.splice( linkIdx, 1 );

                    // Remove a connection from the output connections

                    io.links[ targetIndex ].splice( it, 1 );

                    // Input has no longer any connected link

                    const targetDOM = this._getNodeDOMElement( targetId );
                    const ios = targetDOM.querySelector( '.lexgraphnodeinputs' );
                    const targetIO = ios.childNodes[ targetIndex ];

                    delete targetIO.links;
                    delete targetIO.dataset[ 'active' ];
                }
            }

            delete io.links;
            delete io.dataset[ 'active' ];
        }
    }

    _processFocus( active ) {

        this.isFocused = active;
    }

    _processKey( e, keyUp ) {

        var key = e.key ?? e.detail.key;

        if( keyUp )
        {
            delete this.keys[ key ];
        }
        
        switch( key ) {
            case 'Escape':
                this.unSelectAll();
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this._deleteSelection( e );
                break;
            case 'y':
                if( e.ctrlKey )
                {
                    e.preventDefault();
                    this._doRedo();
                }
                break;
            case 'z':
                if( e.ctrlKey )
                {
                    e.preventDefault();
                    this._doUndo();
                }
                break;
        }

        this.keys[ key ] = true;
    }

    _processKeyUp( e ) {

        var key = e.key ?? e.detail.key;

        delete this.keys[ key ];
    }

    _processMouse( e ) {

        const rect = this.root.getBoundingClientRect();
        
        this._mousePosition = new LX.vec2( e.clientX - rect.x , e.clientY - rect.y );
        this._deltaMousePosition = this._mousePosition.sub( this._lastMousePosition );

        if( e.type == 'mousedown' )
        {
            this.lastMouseDown = LX.getTime();

            this._processMouseDown( e );
        }
        
        else if( e.type == 'mouseup' )
        {
            if( ( LX.getTime() - this.lastMouseDown ) < 120 ) {
                this._processClick( e );
            }

            this._processMouseUp( e );
        }

        else if( e.type == 'mousemove' )
        {
            this._processMouseMove( e );
        }

        else if ( e.type == 'click' ) // trick
        {
            switch( e.detail )
            {
                case LX.MOUSE_DOUBLE_CLICK:
                    break;
                case LX.MOUSE_TRIPLE_CLICK:
                    break;
            }
        }

        else if ( e.type == 'mousewheel' ) {
            e.preventDefault();
            this._processWheel( e );
        }

        else if ( e.type == 'contextmenu' ) {

            e.preventDefault();
            
            if( ( LX.getTime() - this.lastMouseDown ) < 120 ) {
                this._processContextMenu( e );
            }
        }

        else if ( e.type == 'mouseleave' ) {

            if( this._generatingLink )
            {
                this._processMouseUp( e );
            }
        }

        this._lastMousePosition = this._mousePosition;
    }

    _processClick( e ) {

        if( e.target.classList.contains( 'lexgraphnodes' ) )
        {
            this._processBackgroundClick( e );
            return;
        }
    }

    _processBackgroundClick( e ) {

        this.unSelectAll();
    }

    _processMouseDown( e ) {

        // Don't box select over a node..
        if( !e.target.classList.contains( 'lexgraphnode' ) && e.button == LX.MOUSE_LEFT_CLICK )
        {
            this._boxSelecting = this._mousePosition;
            this._boxSelectRemoving = e.altKey;
        }
    }

    _processMouseUp( e ) {

        // It the event reaches this, the link isn't valid..
        if( this._generatingLink )
        {
            deleteElement( this._generatingLink.path ? this._generatingLink.path.parentElement : null );
            delete this._generatingLink;
        }

        else if( this._boxSelecting )
        {
            if( !e.shiftKey && !e.altKey )
                this.unSelectAll();

            this._selectNodesInBox( this._boxSelecting, this._mousePosition, e.altKey );

            deleteElement( this._currentBoxSelectionSVG );

            delete this._currentBoxSelectionSVG;
            delete this._boxSelecting;
            delete this._boxSelectRemoving;
        }
    }

    _processMouseMove( e ) {

        const rightPressed = ( e.which == 3 );

        if( rightPressed )
        {
            this._patternPosition.add( this._deltaMousePosition.div( this._scale ), this._patternPosition );

            this._updatePattern();

            return;
        }

        else if( this._generatingLink )
        {
            this._updatePreviewLink( e );

            return;
        }

        else if( this._boxSelecting )
        {
            this._drawBoxSelection( e );

            return;
        }
    }

    _processWheel( e ) {

        if( this._boxSelecting )
            return;

        // Compute zoom center in pattern space using current scale

        const rect = this.root.getBoundingClientRect();
        const zoomCenter = this._mousePosition ?? new LX.vec2( rect.width * 0.5, rect.height * 0.5 );

        const center = this._getPatternPosition( zoomCenter );

        const delta = e.deltaY;

        if( delta > 0.0 ) this._scale *= 0.9;
        else this._scale *= ( 1.0 / 0.9 );

        this._scale = LX.UTILS.clamp( this._scale, GraphEditor.MIN_SCALE, GraphEditor.MAX_SCALE );

        // Compute zoom center in pattern space using new scale
        // and get delta..

        const newCenter = this._getPatternPosition( zoomCenter );

        const deltaCenter = newCenter.sub( center );

        this._patternPosition = this._patternPosition.add( deltaCenter );

        this._updatePattern( GraphEditor.EVENT_MOUSEWHEEL );
    }

    _processContextMenu( e ) {
        
        LX.addContextMenu( "ADD NODE debug", e, m => {
            
            for( let type in GraphEditor.NODE_TYPES )
            {
                m.add( type, () => { } );
            }
        });
    }

    /**
     * @method start
     */

    start() {

        this.mustStop = false;

        requestAnimationFrame( this._frame.bind(this) );
    }

    /**
     * @method stop
     */

    stop() {

        this.mustStop = true;
        this.state = GraphEditor.STOPPED;
    }

    /**
     * @method _frame
     */

    _frame() {

        if( this.mustStop )
        {
            return;
        }

        requestAnimationFrame( this._frame.bind(this) );

        this._runStep();
    }

    /**
     * @method _runStep
     */

    _runStep() {
        
        const main = this.main;

        if( !main )
            return;

        const visitedNodes = {  };
        
        this._executionNodes = [ ];

        // Reser variables each step?
        this.variables = { };

        const mainId = this.main.dataset[ 'id' ];

        const addNode = ( id ) => {

            if( visitedNodes[ id ] )
                return;

            visitedNodes[ id ] = true;

            for( let linkId in this.links )
            {
                const idx = linkId.indexOf( '@' + id );

                if( idx < 0 )
                    continue;

                const preNodeId = linkId.substring( 0, idx );

                this._executionNodes.push( preNodeId );

                addNode( preNodeId );
            }
        };

        // TODO: Search "no output" nodes and add to the executable list (same as main)..
        // ...

        this._executionNodes.push( mainId );

        addNode( mainId );

        for( var i = this._executionNodes.length - 1; i >= 0; --i )
        {
            const node = this.nodes[ this._executionNodes[ i ] ];

            if( node.data.onBeforeStep )
                node.data.onBeforeStep();

            node.data.execute();

            if( node.data.onBeforeStep )
                node.data.onAfterStep();
        }
    }

    _generatePattern() {

        // Generate pattern
        {
            var pattern = document.createElementNS( 'http://www.w3.org/2000/svg', 'pattern' );
            pattern.setAttribute( 'id', 'pattern-0' );
            pattern.setAttribute( 'x', this._patternPosition.x );
            pattern.setAttribute( 'y', this._patternPosition.y );
            pattern.setAttribute( 'width', this._patternSize.x )
            pattern.setAttribute( 'height', this._patternSize.y );
            pattern.setAttribute( 'patternUnits', 'userSpaceOnUse' );

            var circle = document.createElementNS( 'http://www.w3.org/2000/svg', 'circle' );
            circle.setAttribute( 'cx', this._circlePatternSize );
            circle.setAttribute( 'cy', this._circlePatternSize );
            circle.setAttribute( 'r', this._circlePatternSize );
            circle.setAttribute( 'fill', this._circlePatternColor );

            pattern.appendChild( circle );
        }
        
        var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
        svg.classList.add( "background-svg" );
        svg.style.width = "100%";
        svg.style.height = "100%";

        svg.appendChild( pattern );

        var rect = document.createElementNS( 'http://www.w3.org/2000/svg', 'rect' );
        rect.setAttribute( 'x', '0' );
        rect.setAttribute( 'y', '0' );
        rect.setAttribute( 'width', '100%' );
        rect.setAttribute( 'height', '100%' );
        rect.setAttribute( 'fill', 'url(#pattern-0)' );

        svg.appendChild( rect );

        this._background = svg;

        this.root.appendChild( this._background );
    }

    _updatePattern() {

        if( !this._background )
            return;

        const patternSize = this._patternSize.mul( this._scale );
        const circlePatternSize = this._circlePatternSize * this._scale;
        const patternPosition = this._patternPosition.mul( this._scale );
        
        let pattern = this._background.querySelector( 'pattern' );
        pattern.setAttribute( 'x', patternPosition.x );
        pattern.setAttribute( 'y', patternPosition.y );
        pattern.setAttribute( 'width', patternSize.x )
        pattern.setAttribute( 'height', patternSize.y );

        var circle = this._background.querySelector( 'circle' );
        circle.setAttribute( 'cx', circlePatternSize );
        circle.setAttribute( 'cy', circlePatternSize );
        circle.setAttribute( 'r', circlePatternSize );

        // Nodes

        const w = this._domNodes.offsetWidth * 0.5;
        const h = this._domNodes.offsetHeight * 0.5;

        const dw = w - w * this._scale;
        const dh = h - h * this._scale;

        this._domNodes.style.transform = `
            translate(` + ( patternPosition.x - dw ) + `px, ` + ( patternPosition.y - dh ) + `px) 
            scale(` + this._scale + `)
        `;
        this._domLinks.style.transform = this._domNodes.style.transform;
    }

    _getPatternPosition( renderPosition ) {

        return renderPosition.div( this._scale ).sub( this._patternPosition );
    }

    _computeNodeSize( node ) {

        const ctx = this.dom.getContext("2d");
        var textMetrics = ctx.measureText( node.title );

        let sX = 32 + textMetrics.width * 1.475;

        const rows = Math.max(1,  Math.max(node.inputs.length, node.outputs.length));
        let sY = rows * GraphEditor.NODE_ROW_HEIGHT + GraphEditor.NODE_TITLE_HEIGHT;

        return [sX, sY];
    }

    _onLink( e ) {

        const linkData = this._generatingLink;
        const ioType = e.target.classList.contains( 'input' ) ? GraphEditor.NODE_IO_INPUT : GraphEditor.NODE_IO_OUTPUT;

        // Discard same IO type
        if( linkData.ioType == ioType )
        {
            console.warn( `Can't link same type of data` );
            return;
        }

        // Info about src node
        const src_nodeContainer = linkData.domEl;
        const src_nodeId = src_nodeContainer.dataset[ 'id' ];
        const src_node = this.nodes[ src_nodeId ].data;
        const src_ioIndex = this._generatingLink.index
        
        // Info about dst node
        const dst_nodeContainer = e.target.offsetParent;
        const dst_nodeId = dst_nodeContainer.dataset[ 'id' ];
        const dst_node = this.nodes[ dst_nodeId ].data;
        const dst_ioIndex = parseInt( e.target.parentElement.dataset[ 'index' ] );

        // Discard different types
        const srcIsInput = ( linkData.ioType ==  GraphEditor.NODE_IO_INPUT );
        const src_ios = src_node[ srcIsInput ? 'inputs' : 'outputs' ];
        const src_ioType = src_ios[ src_ioIndex ].type;

        const dst_ios = dst_node[ ioType ==  GraphEditor.NODE_IO_INPUT ? 'inputs' : 'outputs' ];
        const dst_ioType = dst_ios[ dst_ioIndex ].type;

        if( src_ioType != dst_ioType && src_ioType != "any" && dst_ioType != "any"  )
        {
            console.warn( `Can't link ${ src_ioType } to ${ dst_ioType }.` );
            return;
        }

        // Check if target it's an active input and remove the old link

        if( ioType == GraphEditor.NODE_IO_INPUT && e.target.parentElement.dataset[ 'active' ] )
        {
            this._deleteLinks( dst_nodeId, e.target.parentElement );
        }

        // Check if source it's an active input and remove the old link

        else if( linkData.ioType == GraphEditor.NODE_IO_INPUT && linkData.io.dataset[ 'active' ] )
        {
            this._deleteLinks( src_nodeId, linkData.io );
        }

        // Mark as active 

        linkData.io.dataset[ 'active' ] = true;
        e.target.parentElement.dataset[ 'active' ] = true;

        // Store the end io..

        var srcDom = linkData.io;
        srcDom.links = srcDom.links ?? [ ];
        srcDom.links[ dst_ioIndex ] = srcDom.links[ dst_ioIndex ] ?? [ ];
        srcDom.links[ dst_ioIndex ].push( dst_nodeId );
        
        var dstDom = e.target.parentElement;
        dstDom.links = dstDom.links ?? [ ];
        dstDom.links[ src_ioIndex ] = dstDom.links[ src_ioIndex ] ?? [ ];
        dstDom.links[ src_ioIndex ].push( src_nodeId );

        // Call this using the io target to set the connection to the center of the input DOM element..
        
        let path = this._updatePreviewLink( null, e.target.parentElement );

        // Store link

        const pathId = ( srcIsInput ? dst_nodeId : src_nodeId ) + '@' + ( srcIsInput ? src_nodeId : dst_nodeId );

        if( !this.links[ pathId ] ) this.links[ pathId ] = [];

        this.links[ pathId ].push( {
            path: path,
            inputNode: srcIsInput ? src_nodeId : dst_nodeId,
            inputIdx: srcIsInput ? src_ioIndex : dst_ioIndex,
            outputNode: srcIsInput ? dst_nodeId : src_nodeId,
            outputIdx: srcIsInput ? dst_ioIndex : src_ioIndex
        } );

        path.dataset[ 'id' ] = pathId;

        // Successful link..
        return true;
    }

    _updatePreviewLink( e, endIO ) {

        var path = this._generatingLink.path;

        if( !path )
        {
            var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
            svg.classList.add( "link-svg" );
            svg.style.width = "100%";
            svg.style.height = "100%";
            this._domLinks.appendChild( svg );

            path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
            path.setAttribute( 'fill', 'none' );
            svg.appendChild( path );
            this._generatingLink.path = path;
        }

        // Generate bezier curve

        const index = this._generatingLink.index;
        const type = this._generatingLink.ioType;
        const domEl = this._generatingLink.domEl;

        const offsetY = this.root.offsetTop;

        const ios = domEl.querySelector( type == GraphEditor.NODE_IO_INPUT ? '.lexgraphnodeinputs' : '.lexgraphnodeoutputs' );
        const ioEl = ios.childNodes[ index ].querySelector( '.io__type' );
        const startRect = ioEl.getBoundingClientRect();
        
        let startScreenPos = new LX.vec2( startRect.x, startRect.y - offsetY );
        let startPos = this._getPatternPosition( startScreenPos );
        startPos.add( new LX.vec2( 7, 7 ), startPos );
        
        let endPos = null;

        if( e )
        {
            endPos = new LX.vec2( e.offsetX, e.offsetY );

            // Add node position, since I can't get the correct position directly from the event..
            if( e.target.classList.contains( 'lexgraphnode' ) )
            {
                endPos.add( new LX.vec2( parseFloat( e.target.style.left ), parseFloat( e.target.style.top ) ), endPos );
            }
            else if( e.target.classList.contains( 'io__type' ) )
            {
                var parent = e.target.offsetParent;
                // Add parent offset
                endPos.add( new LX.vec2( parseFloat( parent.style.left ), parseFloat( parent.style.top ) ), endPos );
                // Add own offset
                endPos.add( new LX.vec2( e.target.offsetLeft, e.target.offsetTop ), endPos );
            }
        }
        else
        {
            const ioRect = endIO.querySelector( '.io__type' ).getBoundingClientRect();
            
            endPos = new LX.vec2( ioRect.x, ioRect.y - offsetY );
            endPos = this._getPatternPosition( endPos );
            endPos.add( new LX.vec2( 7, 7 ), endPos );
        }

        const distanceX = LX.UTILS.clamp( Math.abs( startPos.x - endPos.x ), 0.0, 180.0 );
        const cPDistance = 128.0 * Math.pow( distanceX / 180.0, 1.5 ) * ( type == GraphEditor.NODE_IO_INPUT ? -1 : 1 );

        let cPoint1 = startScreenPos.add( new LX.vec2( cPDistance, 0 ) );
        cPoint1 = this._getPatternPosition( cPoint1 );
        cPoint1.add( new LX.vec2( 7, 7 ), cPoint1 );
        let cPoint2 = endPos.sub( new LX.vec2( cPDistance, 0 ) );

        path.setAttribute( 'd', `
            M ${ startPos.x },${ startPos.y }
            C ${ cPoint1.x },${ cPoint1.y } ${ cPoint2.x },${ cPoint2.y } ${ endPos.x },${ endPos.y }
        ` );

        path.setAttribute( 'stroke', endIO ? getComputedStyle( ioEl ).backgroundColor : "#b4b4b4" );

        return path;
    }

    _updateNodeLinks( nodeId ) {

        var node = this.nodes[ nodeId ] ? this.nodes[ nodeId ].data : null;

        if( !node ) {
            console.warn( `Can't finde node [${ nodeId }]` );
            return;
        }

        const nodeDOM = this._getNodeDOMElement( nodeId );

        // Update input links

        for( let input of nodeDOM.querySelectorAll( '.ioinput' ) )
        {
            if( !input.links )
                continue;

            // Get first and only target output..
            const targets = input.links.filter( v => v !== undefined )[ 0 ];
            const targetNodeId = targets[ 0 ];

            const ioIndex = parseInt( input.dataset[ 'index' ] );

            var links = this._getLinks( targetNodeId, nodeId );

            // Inputs only have 1 possible output connected
            var link = links.find( i => ( i.inputIdx == ioIndex ) );

            this._generatingLink = {
                index: ioIndex,
                io: input,
                ioType: GraphEditor.NODE_IO_INPUT,
                domEl: nodeDOM,
                path: link.path
            };

            // Get end io

            const outputNode = this._getNodeDOMElement( targetNodeId );
            const io = outputNode.querySelector( '.lexgraphnodeoutputs' ).childNodes[ link.outputIdx ]

            this._updatePreviewLink( null, io );
        }

        // Update output links
        
        
        for( let output of nodeDOM.querySelectorAll( '.iooutput' ) )
        {
            if( !output.links )
            continue;

            const srcIndex = parseInt( output.dataset[ 'index' ] );

            for( let targetIndex = 0; targetIndex < output.links.length; ++targetIndex )
            {
                const targets = output.links[ targetIndex ];

                if( !targets )
                continue;

                for( let targetId of targets )
                {
                    var links = this._getLinks( nodeId, targetId );
                    var link = links.find( i => ( i.inputIdx == targetIndex && i.outputIdx == srcIndex ) );

                    // Outputs can have different inputs connected
                    this._generatingLink = {
                        index: link.outputIdx,
                        io: output,
                        ioType: GraphEditor.NODE_IO_OUTPUT,
                        domEl: nodeDOM,
                        path: link.path
                    };

                    // Get end io

                    const inputNode = this._getNodeDOMElement( targetId );
                    const io = inputNode.querySelector( '.lexgraphnodeinputs' ).childNodes[ link.inputIdx ]

                    this._updatePreviewLink( null, io );
                }
            }
        }

        delete this._generatingLink;
    }

    _drawBoxSelection( e ) {

        var svg = this._currentBoxSelectionSVG;

        if( !svg )
        {
            var svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
            svg.classList.add( "box-selection-svg" );
            if( this._boxSelectRemoving )
                svg.classList.add( "removing" );
            svg.style.width = "100%";
            svg.style.height = "100%";
            this._domLinks.appendChild( svg );
            this._currentBoxSelectionSVG = svg;
        }

        // Generate box

        let startPos = this._getPatternPosition( this._boxSelecting );
        let size = this._getPatternPosition( this._mousePosition ).sub( startPos );

        if( size.x < 0 ) startPos.x += size.x;
        if( size.y < 0 ) startPos.y += size.y;

        size = size.abs();

        svg.innerHTML = `<rect
            x="${ startPos.x }" y="${ startPos.y }"
            rx="${ 6 }" ry="${ 6 }"
            width="${ size.x }" height="${ size.y }"
        "/>`;
    }

    // TODO: Return the ones in the viewport
    _getVisibleNodes() {

        if( !this.graph )
        {
            console.warn( "No graph set" );
            return [];
        }

        return this.graph.nodes;
    }

    _selectNodesInBox( lt, rb, remove ) {

        lt = this._getPatternPosition( lt );
        rb = this._getPatternPosition( rb );

        let size = rb.sub( lt );

        if( size.x < 0 )
        {
            var tmp = lt.x;
            lt.x = rb.x;
            rb.x = tmp;
        }

        if( size.y < 0 )
        {
            var tmp = lt.y;
            lt.y = rb.y;
            rb.y = tmp;
        }

        for( let nodeEl of this._domNodes.children )
        {
            let pos = this._getNodePosition( nodeEl );
            let size = new LX.vec2( nodeEl.offsetWidth, nodeEl.offsetHeight );

            if( ( !( pos.x < lt.x && ( pos.x + size.x ) < lt.x ) && !( pos.x > rb.x && ( pos.x + size.x ) > rb.x ) ) && 
                ( !( pos.y < lt.y && ( pos.y + size.y ) < lt.y ) && !( pos.y > rb.y && ( pos.y + size.y ) > rb.y ) ) )
            {
                if( remove )
                    this._unSelectNode( nodeEl );
                else
                    this._selectNode( nodeEl, true, false );
            }
        }
    }

    _deleteSelection( e ) {

        const lastNodeCount = this._domNodes.childElementCount;

        for( let nodeId of this.selectedNodes )
        {
            this._deleteNode( nodeId );
        }

        this.selectedNodes.length = 0;

        // We delete something, so add undo step..

        if( this._domNodes.childElementCount != lastNodeCount )
        {
            this._addUndoStep();
        }

    }

    _addUndoStep( deleteRedo = true )  {

        if( deleteRedo ) 
        {
            // Remove all redo steps
            this._redoSteps.length = 0;
        }

        this._undoSteps.push( {
            // TODO: Add graph state
        } );
    }

    _doUndo() {

        if( !this._undoSteps.length )
            return;

        this._addRedoStep();

        // Extract info from the last state
        const step = this._undoSteps.pop();

        // Set old state
        // TODO

        console.log( "Undo!!" );
    }

    _addRedoStep()  {

        this._redoSteps.push( {
            // TODO: Add graph state
        } );
    }

    _doRedo() {

        if( !this._redoSteps.length )
            return;

        this._addUndoStep( false );

        // Extract info from the next saved code state
        const step = this._redoSteps.pop();

        // Set old state
        // TODO

        console.log( "Redo!!" );
    }

    _addGlobalActions() {

        
    }
}

LX.GraphEditor = GraphEditor;


/**
 * @class Graph
 */

class Graph {

    /**
     * @param {*} options
     * 
     */

    constructor( options = {} ) {

        // Nodes

        const mainNode = GraphEditor.addNode( 'system/Main' );
        mainNode.position = new LX.vec2( 650, 400 );

        const addNode = GraphEditor.addNode( 'math/Add' );
        addNode.position = new LX.vec2( 425, 250 );

        const floatNode = GraphEditor.addNode( 'inputs/Float' );
        floatNode.position = new LX.vec2( 200, 200 );

        const stringNode = GraphEditor.addNode( 'inputs/String' );
        stringNode.position = new LX.vec2( 400, 50 );

        const setVarNode = GraphEditor.addNode( 'variables/SetVariable' );
        setVarNode.position = new LX.vec2( 650, 50 );

        // const multNode = new GraphNode( GraphEditor.DEFAULT_NODES[ 'Multiply' ] );
        // multNode.position = new LX.vec2( 200, 400 );

        const keydownNode = GraphEditor.addNode( 'events/KeyDown' );
        keydownNode.position = new LX.vec2( 600, 200 );

        // const orNode = new GraphNode( GraphEditor.DEFAULT_NODES[ 'Or' ] );
        // orNode.position = new LX.vec2( 435, 435 );

        this.nodes = [
            mainNode,
            addNode,
            floatNode,
            setVarNode,
            stringNode,
            keydownNode,
            // multNode,
            // orNode
        ];
    }
}

LX.Graph = Graph;

/**
 * @class GraphNode
 */

class GraphNode {

    constructor() { }

    _hasOutputsConnected() {

        return true;
    }

    execute() {

        if( !this._hasOutputsConnected() )
            return;

        if( this.onExecute )
        {
            this.onExecute();
        }
    }

    addInput( name, type ) {

        this.inputs.push( { name: name, type: type } );
    }

    addOutput( name, type ) {

        this.outputs.push( { name: name, type: type } );
    }

    addProperty( name, type, value ) {

        this.properties.push( { name: name, type: type, value: value } );
    }

    getInput( index ) {

        if( !this.inputs || !this.inputs.length || !this.inputs[ index ] )
            return;

        // Get data from link

        for( let linkId in this.graph.links )
        {
            const idx = linkId.indexOf( '@' + this.id );

            if( idx < 0 )
                continue;

            const nodeLinks = this.graph.links[ linkId ];

            for ( var link of nodeLinks )
            {
                if( link.inputIdx != index )
                    continue;

                // This is the value!!
                return link.data;
            }
        }
    }

    setOutput( index, data ) {

        if( !this.outputs || !this.outputs.length || !this.outputs[ index ] )
            return;

        // Set data in link

        for( let linkId in this.graph.links )
        {
            const idx = linkId.indexOf( this.id + '@' );

            if( idx < 0 )
                continue;

            const nodeLinks = this.graph.links[ linkId ];

            for ( var link of nodeLinks )
            {
                if( link.outputIdx != index )
                    continue;

                link.data = data;
            }
        }
    }

    getOutput( index ) {

        return this.outputs[ index ].value;
    }
}

LX.GraphNode = GraphNode;

/*
    Math nodes
*/

function NodeAdd()
{
    this.addInput( null, "float" );
    this.addInput( null, "float" );
    this.addOutput( null, "float" );
}

NodeAdd.title = "Add";
NodeAdd.desc = "Add two floats";

NodeAdd.prototype.onExecute = function()
{
    var a = this.getInput( 0 ), b = this.getInput( 1 ) ?? 0;
    if( a == undefined || a.constructor != Number )
        return;
    this.setOutput( 0, a + b );
};

GraphEditor.registerCustomNode( "math/Add", NodeAdd );

// GraphEditor.registerDefaultNode( "Add", "math", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "float" } ],
//     fn: function() {
//         
//     }
// } );

// GraphEditor.registerDefaultNode( "Substract", "math", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "float" } ],
//     fn: function() {
//         var a = this.getInput( 0 ), b = this.getInput( 1 ) ?? 0;
//         if( a == undefined || a.constructor != Number )
//             return;
//         this.setOutput( 0, a - b );
//     }
// } );

// GraphEditor.registerDefaultNode( "Multiply", "math", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "float" } ],
//     fn: function() {
//         var a = this.getInput( 0 ), b = this.getInput( 1 ) ?? 1;
//         if( a == undefined || a.constructor != Number )
//             return;
//         this.setOutput( 0, a * b );
//     }
// } );

// GraphEditor.registerDefaultNode( "Divide", "math", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "float" } ],
//     fn: function() {
//         var a = this.getInput( 0 ), b = this.getInput( 1 ) ?? 0;
//         if( a == undefined || a.constructor != Number )
//             return;
//         this.setOutput( 0, a / b );
//     }
// } );

/*
    Logical operator nodes
*/

// GraphEditor.registerDefaultNode( "And", "logic", {
//     inputs: [ { type: "bool" }, { type: "bool" } ],
//     outputs: [ { type: "bool" } ],
//     fn: function() {
//         var a = this.getInput( 0 ), b = this.getInput( 1 ) ?? 0;
//         if( a == undefined || b == undefined )
//             return;
//         this.setOutput( 0, !!( a ) && !!( b ) );
//     }
// } );

// GraphEditor.registerDefaultNode( "Or", "logic", {
//     inputs: [ { type: "bool" }, { type: "bool" } ],
//     outputs: [ { type: "bool" } ],
//     fn: function() {
//         var a = this.getInput( 0 ), b = this.getInput( 1 ) ?? 0;
//         if( a == undefined || b == undefined )
//             return;
//         this.setOutput( 0, !!( a ) || !!( b ) );
//     }
// } );

// GraphEditor.registerDefaultNode( "Equal", "logic", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "bool" } ]
// } );

// GraphEditor.registerDefaultNode( "Not Equal", "logic", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "bool" } ]
// } );

// GraphEditor.registerDefaultNode( "Less", "logic", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "bool" } ]
// } );

// GraphEditor.registerDefaultNode( "Less or Equal", "logic", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "bool" } ]
// } );

// GraphEditor.registerDefaultNode( "Greater", "logic", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "bool" } ]
// } );

// GraphEditor.registerDefaultNode( "Greater or Equal", "logic", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "bool" } ]
// } );

// GraphEditor.registerDefaultNode( "Greater or Equal", "logic", {
//     inputs: [ { type: "float" }, { type: "float" } ],
//     outputs: [ { type: "bool" } ]
// } );

// GraphEditor.registerDefaultNode( "Select", "logic", {
//     inputs: [ { name: "A", type: "float" }, { name: "B", type: "float" }, { name: "Condition", type: "bool" } ],
//     outputs: [ { type: "float" } ]
// } );

// GraphEditor.registerDefaultNode( "Compare", "logic", {
//     inputs: [ { name: "A", type: "float" }, { name: "B", type: "float" }, { name: "True", type: "float" }, { name: "False", type: "float" } ],
//     outputs: [ { type: "float" } ]
// } );

/*
    Event nodes
*/

function NodeKeyDown()
{
    this.addOutput( null, "bool" );
    this.addProperty( "Key", "string", " " );
}

NodeKeyDown.title = "KeyDown";
NodeKeyDown.desc = "Gets true if key is pressed";

NodeKeyDown.prototype.onExecute = function()
{
    this.setOutput( 0, !!this.graph.keys[ this.properties[ 0 ].value ] );
};

GraphEditor.registerCustomNode( "events/KeyDown", NodeKeyDown );

/*
    Input nodes
*/

function NodeString()
{
    this.addOutput( null, "string" );
    this.addProperty( null, "string", "text" );
}

NodeString.title = "String";
NodeString.desc = "Gets a String constant";

NodeString.prototype.onExecute = function()
{
    this.setOutput( 0, this.properties[ 0 ].value );
};

GraphEditor.registerCustomNode( "inputs/String", NodeString );

function NodeFloat()
{
    this.addOutput( null, "float" );
    this.addProperty( null, "float", 0.0 );
}

NodeFloat.title = "Float";
NodeFloat.desc = "Gets a Float constant";

NodeFloat.prototype.onExecute = function()
{
    this.setOutput( 0, this.properties[ 0 ].value );
};

GraphEditor.registerCustomNode( "inputs/Float", NodeFloat );

function NodeVector2()
{
    this.addOutput( "Value", "vec2" );
    this.addProperty( "Value", "vec2", [ 0, 0 ] );
}

NodeVector2.title = "Vector2";
NodeVector2.desc = "Gets a Vector2 constant";

NodeVector2.prototype.onExecute = function()
{
    this.setOutput( 0, this.properties[ 0 ].value );
};

GraphEditor.registerCustomNode( "inputs/Vector2", NodeVector2 );

function NodeVector3()
{
    this.addOutput( "Value", "vec3" );
    this.addProperty( "Value", "vec3", [ 0, 0, 0 ] );
}

NodeVector3.title = "Vector3";
NodeVector3.desc = "Gets a Vector3 constant";

NodeVector3.prototype.onExecute = function()
{
    this.setOutput( 0, this.properties[ 0 ].value );
};

GraphEditor.registerCustomNode( "inputs/Vector3", NodeVector3 );

function NodeVector4()
{
    this.addOutput( "Value", "vec4" );
    this.addProperty( "Value", "vec4", [ 0, 0, 0, 0 ] );
}

NodeVector4.title = "Vector4";
NodeVector4.desc = "Gets a Vector4 constant";

NodeVector4.prototype.onExecute = function()
{
    this.setOutput( 0, this.properties[ 0 ].value );
};

GraphEditor.registerCustomNode( "inputs/Vector4", NodeVector4 );

/*
    Variable nodes
*/

function NodeSetVariable()
{
    this.addInput( "Name", "string" );
    this.addInput( "Value", "any" );
    this.addOutput( null, "any" );
}

NodeSetVariable.title = "Set Variable";
NodeSetVariable.desc = "Sets a value for a graph variable";

NodeSetVariable.prototype.onExecute = function()
{
    var varName = this.getInput( 0 );
    if( varName == undefined )
        return;
    var varValue = this.getInput( 1 );
    if( varValue == undefined )
        return;
    this.graph.setVariable( varName, varValue );
    this.setOutput( 0, varValue );
};

GraphEditor.registerCustomNode( "variables/SetVariable", NodeSetVariable );

function NodeGetVariable()
{
    this.addInput( "Name", "string" );
    this.addOutput( null, "any" );
}

NodeGetVariable.title = "Get Variable";
NodeGetVariable.desc = "Gets a graph variable";

NodeGetVariable.prototype.onExecute = function()
{
    var varName = this.getInput( 0 );
    if( varName == undefined )
        return;
    var data = this.graph.getVariable( varName );
    if( data != undefined )
        this.setOutput( 0, data );
};

GraphEditor.registerCustomNode( "variables/GetVariable", NodeGetVariable );

/*
    System nodes
*/

function NodeConsoleLog()
{
    this.addInput( "a", "any" );
}

NodeConsoleLog.title = "Console Log";
NodeConsoleLog.desc = "Console logs a value";

NodeConsoleLog.prototype.onExecute = function()
{
    var data = this.getInput( 0 );
    if( data == undefined )
        return;
    console.log( data );
};

GraphEditor.registerCustomNode( "system/ConsoleLog", NodeConsoleLog );

function NodeMain()
{
    this.addInput( "a", "float" );
    this.addInput( "b", "bool" );
    this.addInput( "Color", "vec4" );
}

NodeMain.title = "Main";
NodeMain.desc = "Main node";

NodeMain.prototype.onExecute = function()
{
    var data = this.getInput( 1 );
    if( data == undefined )
        return;
    console.log( data );
};

GraphEditor.registerCustomNode( "system/Main", NodeMain );

export { GraphEditor, Graph, GraphNode };