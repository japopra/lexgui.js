(function(global){

    if(!global.LX) {
        throw("lexgui.js missing!");
    }

    LX.components.push( 'CodeEditor' );

    function flushCss(element) {
        // By reading the offsetHeight property, we are forcing
        // the browser to flush the pending CSS changes (which it
        // does to ensure the value obtained is accurate).
        element.offsetHeight;
    }

    function allLetter(str) {
        return /^[A-Za-z\s]*$/.test(str);
    }

    function swapElements (array, id0, id1) {
        [array[id0], array[id1]] = [array[id1], array[id0]];
    };

    function isString(str) {
        return (str[0] == '"' &&  str[ str.length - 1 ] == '"') 
                || (str[0] == "'" &&  str[ str.length - 1 ] == "'");
    }

    function popChar(str) {
        return [str.substr(0, str.length - 1), str.substr(str.length - 1)];
    }

    function sliceChar(str, idx) {
        return str.substr(0, idx) + str.substr(idx + 1);
    }

    function lastLetter(str) {
        return str[str.length - 1];
    }

    /**
     * @class CodeEditor
     */

    class CodeEditor {

        static CURSOR_LEFT = 1;
        static CURSOR_TOP = 2;

        /**
         * @param {*} options
         */

        constructor( area, options = {} ) {

            this.base_area = area;
            this.area = new LX.Area( { className: "lexcodeeditor" } );

            this.tabs = this.area.addTabs();

            area.root.style.display = "flex"; // add gutter and code
            area.root.style.position = "relative"; // add gutter and code
            this.gutter = document.createElement('div');
            this.gutter.className = "lexcodegutter";
            area.attach( this.gutter );

            this.root = this.area.root;
            this.root.tabIndex = -1;
            area.attach( this.root );

            this.root.addEventListener( 'keydown', this.processKey.bind(this) );
            this.root.addEventListener( 'mousedown', this.processMouse.bind(this) );
            this.root.addEventListener( 'mouseup', this.processMouse.bind(this) );
            this.root.addEventListener( 'mousemove', this.processMouse.bind(this) );
            this.root.addEventListener( 'focus', this.processFocus.bind(this, true) );
            this.root.addEventListener( 'focusout', this.processFocus.bind(this, false) );

            this.tabs.root.addEventListener( 'dblclick', (e) => {
                e.preventDefault();
                this.addTab("unnamed.js", true);
            } );

            // Cursors and selection

            this.cursors = document.createElement('div');
            this.cursors.className = 'cursors';
            this.tabs.area.attach(this.cursors);

            this.selections = document.createElement('div');
            this.selections.className = 'selections';
            this.tabs.area.attach(this.selections);

            // Add main cursor
            {
                var cursor = document.createElement('div');
                cursor.className = "cursor";
                cursor.innerHTML = "&nbsp;";
                cursor._left = 0;
                cursor.style.left = "0.25em";
                cursor._top = 4;
                cursor.style.top = "4px";
                cursor.charPos = 0;
                cursor.line = 0;
                this.cursors.appendChild(cursor);
            }

            // Test selection
            {
                this.selection = document.createElement('div');
                this.selection.className = "lexcodeselection";
                this.selections.appendChild( this.selection );
            }

            // State

            this.state = {
                overwrite: false,
                focused: false,
                selectingText: false,
                // draggingText: false
            }

            // Code

            this.highlight = 'JavaScript';
            this.onsave = options.onsave ?? ((code) => { console.log(code) });
            this.actions = {};
            this.cursorBlinkRate = 550;
            this.tabSpaces = 4;
            this.maxUndoSteps = 16;
            this._lastTime = null;

            this.languages = [
                'JavaScript', 'GLSL'
            ];
            this.specialKeys = [
                'Backspace', 'Enter', 'ArrowUp', 'ArrowDown', 
                'ArrowRight', 'ArrowLeft', 'Delete', 'Home',
                'End', 'Tab'
            ];
            this.keywords = [
                'var', 'let', 'const', 'this', 'in', 'of', 
                'true', 'false', 'new', 'function', '(', ')',
                'static', 'class', 'constructor'
            ];
            this.builtin = [
                'console', 'window', 'navigator'
            ];
            this.literals = [
                'for', 'if', 'else', 'case', 'switch', 'return',
                'while', 'continue', 'break', 'do'
            ];

            // Action keys

            this.action('Delete', ( ln, cursor, e ) => {
                var letter = this.getCharAtPos( cursor );
                if(!letter) return;
                this.code.lines[ln] = sliceChar( this.code.lines[ln], cursor.charPos );
                this.processLines();
            });

            this.action('Tab', ( ln, cursor, e ) => {
                this.addSpaces( this.tabSpaces );
            });

            this.action('Home', ( ln, cursor, e ) => {
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
            });

            this.action('End', ( ln, cursor, e ) => {
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );
                this.cursorToWord( this.code.lines[ln] );
            });

            this.action('Enter', ( ln, cursor, e ) => {
                cursor.line++;
                this.code.lines.splice(cursor.line, 0, "");
                this.code.lines[cursor.line] = this.code.lines[ln].substr( cursor.charPos );
                this.code.lines[ln] = this.code.lines[ln].substr( 0, cursor.charPos );
                this.cursorToBottom( null, true );
                this.processLines();
            });

            this.action('Backspace', ( ln, cursor, e ) => {
                var letter = this.getCharAtPos( cursor,  -1 );
                if(letter) {
                    this.code.lines[ln] = sliceChar( this.code.lines[ln], cursor.charPos - 1 );
                    this.cursorToLeft( letter );
                } 
                else if(this.code.lines[ln - 1] != undefined) {
                    this.lineUp();
                    this.actions['End'](cursor.line, cursor);
                    // Move line on top
                    this.code.lines[ln - 1] += this.code.lines[ln];
                    this.code.lines.splice(ln, 1);
                }
                this.processLines();
            });

            this.action('ArrowUp', ( ln, cursor, e ) => {
                this.lineUp();
                // Go to end of line if out of line
                var letter = this.getCharAtPos( cursor );
                if(!letter) this.actions['End'](cursor.line, cursor);
            });

            this.action('ArrowDown', ( ln, cursor, e ) => {
                if( this.code.lines[ ln + 1 ] == undefined ) 
                    return;
                this.lineDown();
                // Go to end of line if out of line
                var letter = this.getCharAtPos( cursor );
                if(!letter) this.actions['End'](cursor.line, cursor);
            });

            this.action('ArrowLeft', ( ln, cursor, e ) => {
                if(e.metaKey) {
                    e.preventDefault();
                    this.actions[ 'Home' ]( ln, cursor );
                }else {
                    var letter = this.getCharAtPos( cursor, -1 );
                    if(letter) {
                        let selection = this.selections.children[0];
                        if( e.shiftKey ) {
                            if(!selection.range) this.startSelection(cursor, selection);
                            let new_width;
                            const charWidth = this.measureChar(letter)[0];
                            if( (cursor.charPos - 1) < this.initial_charPos ) {
                                selection.range[0]--;
                                // cursor is not moved yet
                                selection.style.left = "calc(" + (cursor._left - charWidth) + "px + 0.25em)";
                                new_width = +parseInt(selection.style.width) + charWidth;
                            }
                            else if( (cursor.charPos - 1) == this.initial_charPos ) {
                                selection.range[1]--;
                                new_width = 0;
                            }
                            else {
                                selection.range[1]--;
                                new_width = +parseInt(selection.style.width) - this.measureChar(letter)[0];
                            }
                            selection.style.width = new_width + "px";
                            if(new_width == 0) this.removeSelection();
                            this.cursorToLeft( letter, cursor );
                        }else {
                            // no selection
                            if(!selection.range) this.cursorToLeft( letter, cursor );
                            else {
                                this.removeSelection();
                                // TODO: go to start of selection
                                // ...
                            }
                        }
                    }
                    else if( cursor.line > 0 ) {
                        this.lineUp( cursor );
                        this.actions['End'](cursor.line, cursor);
                    }
                }
            });

            this.action('ArrowRight', ( ln, cursor, e ) => {
                if(e.metaKey) {
                    e.preventDefault();
                    this.actions[ 'End' ]( ln, cursor );
                }else {
                    var letter = this.getCharAtPos( cursor );
                    if(letter) {
                        let selection = this.selections.children[0];
                        if( e.shiftKey ) {
                            if(!selection.range) this.startSelection(cursor, selection);
                            let new_width;
                            const charWidth = this.measureChar(letter)[0];
                            if( cursor.charPos < this.initial_charPos ) {
                                selection.range[0]++;
                                // cursor is not moved yet
                                selection.style.left = "calc(" + (cursor._left + charWidth) + "px + 0.25em)";
                                new_width = +parseInt(selection.style.width) - charWidth;
                            }
                            else {
                                selection.range[1]++;
                                new_width = +parseInt(selection.style.width) + charWidth;
                            }
                            selection.style.width = new_width + "px";
                            if(new_width == 0) this.removeSelection();
                            this.cursorToRight( letter, cursor );
                        }else{
                            // no selection
                            if(!selection.range) this.cursorToRight( letter, cursor );
                            else {
                                this.removeSelection();
                                // TODO: go to end of selection
                                // ...
                            }
                        }
                    }
                    else if( this.code.lines[ cursor.line + 1 ] !== undefined ) {
                        this.lineDown( cursor );
                        this.actions['Home'](cursor.line, cursor);
                    }
                }
            });

            // Default code tab
        
            this.openedTabs = { };
            this.addTab("+", false, "New File");
            this.addTab("script1.js", true);

            this.loadFile( "../data/script.js" );

            // Create inspector panel
            let panel = this._create_panel_info();
            area.attach( panel );
        }

        loadFile( filename ) {

            LX.request({ url: filename, success: text => {
                const name = filename.substring(filename.lastIndexOf('/') + 1);
                this.addTab(name, true, filename);
                this.code.lines = text.split('\r\n');
                this.processLines();
                this._refresh_code_info();
            } });
        }

        _create_panel_info() {
            
            let panel = new LX.Panel({ className: "lexcodetabinfo", width: "calc(100% - 16px)", height: "auto" });
            panel.ln = 0;
            panel.col = 0;

            const on_change_language = ( lang ) => {
                this.highlight = lang;
                this._refresh_code_info();
            }

            this._refresh_code_info = (ln = panel.ln, col = panel.col) => {
                panel.ln = ln;
                panel.col = col;
                panel.clear();
                panel.sameLine();
                panel.addLabel(this.code.title, { float: 'right' });
                panel.addLabel("Ln " + ln, { width: "48px" });
                panel.addLabel("Col " + col, { width: "48px" });
                panel.addButton("<b>{ }</b>", this.highlight, (value, event) => {
                    LX.addContextMenu( "Language", event, m => {
                        for( const lang of this.languages )
                            m.add( lang, on_change_language );
                    });
                }, { width: "25%", nameWidth: "15%" });
                panel.endLine();
            };

            this._refresh_code_info();

            return panel;
        }

        addTab(name, selected, title) {
            
            if(this.openedTabs[name])
            {
                this.tabs.select( this.code.tabName );
                return;
            }

            // Create code content
            let code = document.createElement('div');
            code.className = 'code';
            code.lines = [""];
            code.cursorState = {};
            code.undoSteps = [];
            code.tabName = name;
            code.title = title ?? name;
            this.openedTabs[name] = code;

            this.tabs.add(name, code, selected, null, { 'title': code.title, 'onSelect': (e, tabname) => {

                if(tabname == '+')
                {
                    this.addTab("unnamed.js", true);
                    return;
                }

                var cursor = cursor ?? this.cursors.children[0];
                this.saveCursor(cursor, this.code.cursorState);    
                this.code = this.openedTabs[tabname];
                this.restoreCursor(cursor, this.code.cursorState);    
                this.processLines();
                this._refresh_code_info(cursor.line + 1, cursor.charPos);
            }});
            
            if(selected){
                this.code = code;  
                this.resetCursorPos(CodeEditor.CURSOR_LEFT | CodeEditor.CURSOR_TOP);
                this.processLines();
                setTimeout( () => this._refresh_code_info(0, 0), 50 )
            }
        }

        processFocus( active ) {

            if( active )
                this.restartBlink();
            else {
                clearInterval( this.blinker );
                this.cursors.classList.remove('show');
            }
        }

        processMouse(e) {

            if( !this.code ) return;

            const time = new Date();

            if( e.type == 'mousedown' )
            {
                this.lastMouseDown = time.getTime();
                this.state.selectingText = true;
                return;
            }
            
            else if( e.type == 'mouseup' )
            {
                if( (time.getTime() - this.lastMouseDown) < 300 ) {
                    this.state.selectingText = false;
                    this.processClick(e);
                    this.removeSelection();
                }
                this.selection_started = false;
                this.state.selectingText = false;
            }

            else if( e.type == 'mousemove' )
            {
                if( this.state.selectingText )
                {
                    this.processSelection(e);
                }
            }
        }

        processClick(e) {

            var code_rect = this.code.getBoundingClientRect();
            var position = [e.clientX - code_rect.x, e.clientY - code_rect.y];

            var line = -1;
            while( position[1] > (line + 1) * 22 ) 
                line++;
            
            if(this.code.lines[line] == undefined) return;
            
            var cursor = cursor ?? this.cursors.children[0];
            var transition = cursor.style.transition;
            cursor.style.transition = "none"; // no transition!
            this.resetCursorPos( CodeEditor.CURSOR_LEFT | CodeEditor.CURSOR_TOP );

            for( var i = 0; i < line; ++i ) {
                this.cursorToBottom(null, true);
            }

            var chars_width = 0;
            for( let char of this.code.lines[line] )
            {
                var [w, h] = this.measureChar(char);
                chars_width += w;

                if( position[0] < chars_width )
                    break;

                this.cursorToRight(char);
            }
            
            flushCss(cursor);
            cursor.style.transition = transition; // restore transition
            cursor.line = line;
            this._refresh_code_info( line + 1, cursor.charPos );
        }

        processSelection( e, selection ) {

            selection = selection ?? this.selections.children[0];
            var cursor = cursor ?? this.cursors.children[0];

            this.processClick(e);

            if( !this.selection_started )
            {
                this.startSelection(cursor, selection);
            }

            var chars_width = 0;
            for( var i = this.initial_charPos; i < cursor.charPos; ++i )
            {
                let char = this.code.lines[cursor.line][i];
                var [w, h] = this.measureChar(char);
                chars_width += w;
            }

            selection.style.width = chars_width + "px";
            selection.range = [this.initial_charPos, cursor.charPos];
        }

        async processKey(e) {

            if( !this.code ) 
                return;

            var key = e.key;

            // keys with length > 1 are probably special keys
            if( key.length > 1 && this.specialKeys.indexOf(key) == -1 )
                return;

            let cursor = this.cursors.children[0];
            let lidx = cursor.line;
            this.code.lines[lidx] = this.code.lines[lidx] ?? "";

            // Check combinations

            if( e.ctrlKey || e.metaKey )
            {
                switch( key ) {
                    case 's': // save
                        e.preventDefault();
                        this.onsave( this.code.lines.join("\n") );
                        return;
                    case 'c': // copy
                        let selected_text = "";
                        let selection = this.selections.children[0];
                        if( !selection.range ) {
                            selected_text = this.code.lines[cursor.line];
                        }
                        else {
                            for( var i = selection.range[0]; i < selection.range[1]; ++i )
                                selected_text += this.code.lines[cursor.line][i];
                        }
                        navigator.clipboard.writeText(selected_text);
                        return;
                    case 'v': // paste
                        const text = await navigator.clipboard.readText();
                        this.code.lines[lidx] = [
                            this.code.lines[lidx].slice(0, cursor.charPos), 
                            text, 
                            this.code.lines[lidx].slice(cursor.charPos)
                        ].join('');
                        this.cursorToWord( text );
                        this.processLines();
                        return;
                    case 'z': // undo
                        if(!this.code.undoSteps.length)
                            return;
                        const step = this.code.undoSteps.pop();
                        this.code.lines = step.lines;
                        cursor.line = step.line;
                        this.restoreCursor( cursor, step.cursor );
                        this.processLines();
                        return;
                }
            }

            if( e.altKey )
            {
                switch( key ) {
                case 'ArrowUp':
                    if(this.code.lines[ lidx - 1 ] == undefined)
                        return;
                    swapElements(this.code.lines, lidx - 1, lidx);
                    this.lineUp();
                    this.processLines();
                    return;
                case 'ArrowDown':
                    if(this.code.lines[ lidx + 1 ] == undefined)
                        return;
                    swapElements(this.code.lines, lidx, lidx + 1);
                    this.lineDown();
                    this.processLines();
                    return;
                }
            }

            for( const actKey in this.actions ) {
                if( key != actKey ) continue;
                e.preventDefault();
                return this.actions[ key ]( lidx, cursor, e );
            }

            // from now on, don't allow ctrl, shift or meta (mac) combinations
            if( (e.ctrlKey || e.metaKey) )
                return;

            // Add undo steps

            const d = new Date();
            const current = d.getTime();

            if( !this._lastTime ) {
                this._lastTime = current;
                this.code.undoSteps.push( {
                    lines: LX.deepCopy(this.code.lines),
                    cursor: this.saveCursor(cursor),
                    line: cursor.line
                } );
            } else {
                if( (current - this._lastTime) > 3000 && this.code.lines.length){
                    this._lastTime = null;
                    this.code.undoSteps.push( {
                        lines: LX.deepCopy(this.code.lines),
                        cursor: this.saveCursor(cursor),
                        line: cursor.line
                    } );
                }else{
                    // If time not enough, reset timer
                    this._lastTime = current;
                }
            }

            // Append key 

            this.cursorToRight( key );
            // if(key == '{') key += '}';
            this.code.lines[lidx] = [
                this.code.lines[lidx].slice(0, cursor.charPos - 1), 
                key, 
                this.code.lines[lidx].slice(cursor.charPos - 1)
            ].join('');
            this.restartBlink();

            // Update only the current line, since it's only an appended key
            this.processLine( this.code.lines[lidx], lidx );
        }

        action( key, fn ) {
            this.actions[ key ] = fn;
        }

        processLines() {

            this.gutter.innerHTML = "";
            this.code.innerHTML = "";

            for( let i = 0; i < this.code.lines.length; ++i )
            {
                this.processLine( this.code.lines[i], i );
            }
        }

        processLine( line, linenum ) {
            
            this._building_string = false; // multi-line strings not supported by now
            
            // It's allowed to process only 1 line to optimize
            var _lines = this.code.querySelectorAll('pre');
            var pre = null, single_update = false;
            for( let l of _lines )
            if(l.dataset['linenum'] == linenum) {
                pre = l;
                single_update = true;
                break;
            }
            
            if(!pre)
            {
                var pre = document.createElement('pre');
                pre.dataset['linenum'] = linenum;
                this.code.appendChild(pre);
            }
            else
            {
                pre.children[0].remove(); // Remove token list
            }

            var linespan = document.createElement('span');
            pre.appendChild(linespan);

            // Check if comment
            const is_comment = line.split('//');
            line = ( is_comment.length > 1 ) ? is_comment[0] : line;

            const tokens = line.split(' ').join('¬ ¬').split('¬'); // trick to split without losing spaces

            for( let t of tokens )
            {
                let iter = t.matchAll(/[\[\](){}.,;:"']/g);
                let subtokens = iter.next();
                if( subtokens.value )
                {
                    let idx = 0;
                    while( subtokens.value != undefined )
                    {
                        const _pt = t.substring(idx, subtokens.value.index);
                        this.processToken(_pt, linespan);
                        this.processToken(subtokens.value[0], linespan);
                        idx = subtokens.value.index + 1;
                        subtokens = iter.next();
                        if(!subtokens.value) {
                            const _at = t.substring(idx);
                            this.processToken(_at, linespan);
                        }
                    }
                }
                else
                    this.processToken(t, linespan);
            }

            if( is_comment.length > 1 )
                this.processToken("//" + is_comment[1], linespan);

            // add line gutter
            if(!single_update)
            {
                var linenumspan = document.createElement('span');
                linenumspan.innerHTML = (linenum + 1);
                this.gutter.appendChild(linenumspan);
            }
        }

        processToken(token, line) {

            let sString = false;

            if(token == '"' || token == "'")
            {
                sString = (this._building_string == token); // stop string if i was building it
                this._building_string = this._building_string ? this._building_string : token;
            }

            if(token == ' ')
            {
                line.innerHTML += token;
            }
            else
            {
                var span = document.createElement('span');
                span.innerHTML = token;

                if( this._building_string  )
                    span.className += " cm-str";
                
                else if( this.keywords.indexOf(token) > -1 )
                    span.className += " cm-kwd";

                else if( this.builtin.indexOf(token) > -1 )
                    span.className += " cm-bln";

                else if( this.literals.indexOf(token) > -1 )
                    span.className += " cm-lit";

                else if( token.substr(0, 2) == '//' )
                    span.className += " cm-com";

                else if( !Number.isNaN(+token) )
                    span.className += " cm-dec";

                line.appendChild(span);
            }

            if(sString) delete this._building_string;
        }

        lineUp(cursor) {
            cursor = cursor ?? this.cursors.children[0];
            cursor.line--;
            cursor.line = Math.max(0, cursor.line);
            this.cursorToTop();
        }

        lineDown(cursor) {
            cursor = cursor ?? this.cursors.children[0];
            cursor.line++;
            this.cursorToBottom();
        }

        restartBlink() {

            if( !this.code ) return;

            clearInterval(this.blinker);
            this.cursors.classList.add('show');

            if (this.cursorBlinkRate > 0)
                this.blinker = setInterval(() => {
                    this.cursors.classList.toggle('show');
                }, this.cursorBlinkRate);
            else if (this.cursorBlinkRate < 0)
                this.cursors.classList.remove('show');
        }

        startSelection( cursor, selection ) {

            this.selections.classList.add('show');
            selection.style.left = cursor.style.left;
            selection.style.top = cursor.style.top;
            selection.range = [cursor.charPos, cursor.charPos];
            selection.style.width = "0px";
            this.initial_charPos = cursor.charPos;
            this.selection_started = true;
        }

        removeSelection( selection ) {

            this.selections.classList.remove('show');
            selection = selection ?? this.selections.children[0];
            selection.range = null;
        }

        cursorToRight( key, cursor ) {

            if(!key) return;
            cursor = cursor ?? this.cursors.children[0];
            var [w, h] = this.measureChar(key);
            cursor._left += w;
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor.charPos++;
            this.restartBlink();
            this._refresh_code_info( cursor.line + 1, cursor.charPos );
        }

        cursorToLeft( key, cursor ) {

            cursor = cursor ?? this.cursors.children[0];
            var [w, h] = this.measureChar(key);
            cursor._left -= w;
            cursor._left = Math.max(cursor._left, 0);
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor.charPos--;
            cursor.charPos = Math.max(cursor.charPos, 0);
            this.restartBlink();
            this._refresh_code_info( cursor.line + 1, cursor.charPos );
        }

        cursorToTop( cursor, resetLeft = false ) {

            cursor = cursor ?? this.cursors.children[0];
            var h = 22;
            cursor._top -= h;
            cursor._top = Math.max(cursor._top, 4);
            cursor.style.top = "calc(" + cursor._top + "px)";
            this.restartBlink();
            
            if(resetLeft)
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );

            this._refresh_code_info( cursor.line + 1, cursor.charPos );
        }

        cursorToBottom( cursor, resetLeft = false ) {

            cursor = cursor ?? this.cursors.children[0];
            var h = 22;
            cursor._top += h;
            cursor.style.top = "calc(" + cursor._top + "px)";
            this.restartBlink();

            if(resetLeft)
                this.resetCursorPos( CodeEditor.CURSOR_LEFT, cursor );

            this._refresh_code_info( cursor.line + 1, cursor.charPos );
        }

        cursorToWord( text ) {
            for( let char of text ) 
                this.cursorToRight(char);
        }

        saveCursor( cursor, state = {} ) {
            var cursor = cursor ?? this.cursors.children[0];
            state.top = cursor._top;
            state.left = cursor._left;
            state.line = cursor.line;
            state.charPos = cursor.charPos;
            return state;
        }

        restoreCursor( cursor, state ) {
            cursor = cursor ?? this.cursors.children[0];
            cursor.line = state.line ?? 0;
            cursor.charPos = state.charPos ?? 0;

            var transition = cursor.style.transition;
            cursor.style.transition = "none"; // no transition!
            cursor._left = state.left ?? 0;
            cursor.style.left = "calc(" + cursor._left + "px + 0.25em)";
            cursor._top = state.top ?? 4;
            cursor.style.top = "calc(" + cursor._top + "px)";
            flushCss(cursor);
            cursor.style.transition = transition; // restore transition
        }

        resetCursorPos( flag, cursor ) {
            
            cursor = cursor ?? this.cursors.children[0];
            var transition = cursor.style.transition;
            cursor.style.transition = "none";

            if( flag & CodeEditor.CURSOR_LEFT )
            {
                cursor._left = 0;
                cursor.style.left = "0.25em";
                cursor.charPos = 0;
            }

            if( flag & CodeEditor.CURSOR_TOP )
            {
                cursor._top = 4;
                cursor.style.top = "4px";
                cursor.line = 0;
            }

            flushCss(cursor);
            cursor.style.transition = transition;
        }

        addSpaces(n) {
            for( var i = 0; i < n; ++i ) {
                this.root.dispatchEvent(new KeyboardEvent('keydown', {'key': ' '}));
            }
        }

        getCharAtPos( cursor, offset = 0) {
            cursor = cursor ?? this.cursors.children[0];
            return this.code.lines[cursor.line][cursor.charPos + offset];
        }

        measureChar(char) {
            var test = document.createElement("pre");
            test.className = "codechar";
            test.innerHTML = char;
            document.body.appendChild(test);
            var rect = test.getBoundingClientRect();
            test.remove();
            return [Math.floor(rect.width), Math.floor(rect.height)];
        }
    }

    LX.CodeEditor = CodeEditor;

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );