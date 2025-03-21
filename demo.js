import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';
import 'lexgui/components/timeline.js';
import 'lexgui/components/audio.js';

window.LX = LX;

// Init library and get main area
let area = LX.init();

// Change global properties after init
// LX.DEFAULT_NAME_WIDTH = "10%";
// LX.DEFAULT_SPLITBAR_SIZE = 16;
// LX.OPEN_CONTEXTMENU_ENTRY = 'mouseover';

// LX.message("Im in another position", null, { position: [10, 10] });
// LX.message("Welcome to Lexgui", "Welcome!");

// Change some theme colors...
// LX.setThemeColor('global-color-primary', "#211");
// LX.setThemeColor('global-selected', "#a74");
// LX.setThemeColor('global-text', "#f21");

const code = `
import { LX } from 'lexgui';

class Test {

    constructor() {

        this.foo = 1;

        var div = document.createElement('div');
        div.style.width = "100px"
        div.style.height = "100px"

        // single line comment

        document.body.appendChild( div );

        let a = 1; /* single line block comment */ let b = 2;

        /*
            multiple line block comment
        */
    }
}
`;

const snippet = LX.makeCodeSnippet(code, ["780px", "auto"], {
    tabName: "script.js",
    language: "JavaScript",
    linesAdded: [2, [10, 12]],
    linesRemoved: [14, 16],
    xlineNumbers: false,
    windowMode: true
});
snippet.style.left = "200px";
snippet.style.top = "200px";
snippet.style.position = "absolute";
document.body.appendChild( snippet );

// menu bar
area.addMenubar( m => {

    // {options}: callback, icon, short

    m.add( "Scene/New Scene", () => { console.log("New scene created!") });
    m.add( "Scene/Open Scene", { icon: "fa-solid fa-folder-open", short:  "S", callback: () => { console.log("Opening SCENE Dialog") } } );
    m.add( "Scene/Open Recent/hello.scene", name => { console.log("Opening " + name) });
    m.add( "Scene/Open Recent/goodbye.scene", name => { console.log("Opening " + name) });
    m.add( "Project/Project Settings" );
    m.add( "Project/Export", { icon: "fa-solid fa-download" });
    m.add( "Project/Export/DAE", { icon: "fa-solid fa-cube", short: "D", callback: () => { console.log("Exporting DAE...") }} );
    m.add( "Project/Export/GLTF", { short:  "G" } );
    m.add( "Editor/Autosave", { type: 'checkbox', icon: "fa fa-floppy-disk", callback: (v, name) => { console.log(name + ": " + v ) } });
    m.add( "Editor/Test", () => LX.prompt("Write in the text area below the bml instructions to move the avatar from the web application. A sample of BML instructions can be tested through the helper tabs in the right panel.", "Test?"));
    m.add( "Editor/Settings", { icon: "fa-solid fa-gears", callback: () => {
        const dialog = new LX.Dialog( "Settings", p => {
            p.addText("A Text", "Testing first widget");
            p.sameLine(3);
            p.addLabel("Buttons:");
            p.addButton(null, "Click me", () => {
                console.log( p.getValue("A Text") );
            });
            p.addButton(null, "Click me v2!", () => {
                console.log( p.getValue("A Text") );
            });
        });
    }} );
    m.add( "Editor/Write BML", { icon: "fa-solid fa-gears", callback: () => {

        new LX.PocketDialog( "BML Instruction", p => {

            let htmlStr = "Write in the text area below the bml instructions to move the avatar from the web application. A sample of BML instructions can be tested through the helper tabs in the right panel.";
            p.addTextArea(null, htmlStr, null, {disabled: true, fitHeight: true});

            p.addButton(null, "Click here to see BML instructions and attributes", () => {
                window.open("https://github.com/upf-gti/SignON-realizer/blob/SiGMLExperiments/docs/InstructionsBML.md");
            });

            htmlStr = "Note: In 'speech', all text between '%' is treated as actual words. An automatic translation from words (dutch) to phonemes (arpabet) is performed.";
            htmlStr += "\n\nNote: Each instruction is inside '{}'. Each instruction is separated by a coma ',' except que last one.";
            p.addTextArea(null, htmlStr, null, {disabled: true, fitHeight: true});

            htmlStr = 'An example: { "type":"speech", "start": 0, "text": "%hallo%.", "sentT": 1, "sentInt": 0.5 }, { "type": "gesture", "start": 0, "attackPeak": 0.5, "relax": 1, "end": 2, "locationBodyArm": "shoulder", "lrSym": true, "hand": "both", "distance": 0.1 }';
            p.addTextArea(null, htmlStr, null, {disabled: true, fitHeight: true});

            const area = new LX.Area({ height: "250px" });
            p.attach( area.root );

            window.editor = new LX.CodeEditor(area, {
                highlight: 'JSON',
                skip_info: true
            });

            p.addButton(null, "Send", () => {
                console.log(":)")
            });

        }, { size: ["30%", null], float: "right", draggable: false});
    }} );
    m.add( "Editor/Open AssetView", { icon: "fa-solid fa-rect", callback: () => { createAssetDialog(); }} );
    m.add( "Account/Login", { icon: "fa-solid fa-user", callback: () => { createLoginForm(); }} );
    m.add( "Timeline/Shortcuts", { disabled: true });
    m.add( "Timeline/Shortcuts/Play-Pause", { short: "SPACE" });
    m.add( "Timeline/Shortcuts/Zoom", { short: "Wheel" });
    m.add( "Timeline/Shortcuts/Change time", { short: "Left Click+Drag" });
    m.add( "Timeline/Shortcuts/Move keys", { short: "Hold CTRL" });
    m.add( "Timeline/Shortcuts/Add keys", { short: "Right Click" });
    m.add( "Timeline/Shortcuts/Delete keys");
    m.add( "Timeline/Shortcuts/Delete keys/Single", { short: "DEL" });
    m.add( "Timeline/Shortcuts/Delete keys/Multiple", { short: "Hold LSHIFT" });
    m.add( "Timeline/Shortcuts/Key Selection");
    m.add( "Timeline/Shortcuts/Key Selection/Single", { short: "Left Click" });
    m.add( "Timeline/Shortcuts/Key Selection/Multiple", { short: "Hold LSHIFT" });
    m.add( "Timeline/Shortcuts/Key Selection/Box", { short: "Hold LSHIFT+Drag" });
    m.add( "Help/Search Help", { icon: "fa-solid fa-magnifying-glass", short:  "F1", callback: () => { window.open("./docs/") }});
    m.add( "Help/Support LexGUI/Please", { icon: "fa-solid fa-heart" } );
    m.add( "Help/Support LexGUI/Do it" );
    m.addButtons( [
        {
            title: "Play",
            icon: "fa-solid fa-play",
            swap: "fa-solid fa-stop",
            callback:  (event, swapValue) => {
                if( swapValue ) console.log("play!");
                else console.log("stop!");
            }
        },
        {
            title: "Pause",
            icon: "fa-solid fa-pause",
            disabled: true,
            callback:  (event) => { console.log("pause!"); }
        },
        {
            icon: "fa-solid fa-magnifying-glass",
            callback:  (event) => {
                const playButton = m.getButton( "Play" );
                playButton.swap();
                console.log("glass!");
            }
        },
        {
            title: "Change Theme",
            icon: "fa-solid fa-moon",
            swap: "fa-solid fa-sun",
            callback:  (event, swapValue) => { LX.setTheme( swapValue ? "light" : "dark" ) }
        }
    ]);
    
    m.getButton("Play");
    m.setButtonIcon("Github", "fa-brands fa-github", () => {window.open("https://github.com/jxarco/lexgui.js/")})
    m.setButtonImage("lexgui.js", "images/icon.png", () => {window.open("https://jxarco.github.io/lexgui.js/")}, {float: "left"})
});

// split main area
var [left, right] = area.split({ sizes:["80%","20%"], minimizable: true });

// left.addSidebar( m => {
//     m.add( "Scene", { icon: "fa fa-cube", callback: () => {  } } );
//     m.add( "Code", { icon: "fa fa-code", callback: () => {  } } );
//     m.add( "Search", { icon: "fa fa-search", bottom: true, callback: () => { } } );
// });

// split left area
var [up, bottom] = left.split({ type: 'vertical', sizes:["50%", null], minimizable: true });

var kfTimeline = null;
var clipsTimeline = null;
var curvesTimeline = null;

bottom.onresize = bounding => {
    if(kfTimeline) kfTimeline.resize( [ bounding.width, bounding.height ] );
    if(clipsTimeline) clipsTimeline.resize( [ bounding.width, bounding.height ] );
    if(curvesTimeline) curvesTimeline.resize( [ bounding.width, bounding.height ] );
}

// another menu bar
bottom.addMenubar( m => {
    m.add( "Information", e => { 
        console.log(e); 
        var el = document.getElementById('kf-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('clips-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('curves-timeline');
        if(el)
            el.style.display = 'none';
        var bottomPanel = document.getElementById('bottom-panel');
        bottomPanel.style.display = 'block';
    });

    m.add( "Keyframes Timeline", e => { 
        console.log(e);
        let el = document.getElementById('bottom-panel');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('clips-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('curves-timeline');
        if(el)
            el.style.display = 'none';
        var timeline = document.getElementById('kf-timeline');            
        if(timeline) {
            timeline.style.display = 'block';
            kfTimeline.resize();
        }
        else {
            kfTimeline = new LX.KeyFramesTimeline("kf-timeline", {
                onBeforeCreateTopBar: panel => {
                    panel.addButton('', '<i class="fa fa-wand-magic-sparkles"></i>', ( value, event ) => { });
                }
            });

            bottom.attach(kfTimeline.root);
            kfTimeline.setSelectedItems(["Item 1", "Item 2", "Item 3"]);
            kfTimeline.setAnimationClip({tracks: [{name: "Item 1.position", values: [0,1,0, 1], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 1.scale", values: [0,1,0, 0.5], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 2", values: [0,1,0,1], times: [0.1, 0.2, 0.3, 0.8]}, {name: "Item 3.position", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 3.scale", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}], duration: 1});
            kfTimeline.draw( 0 );
        }
    });

    m.add( "Clips Timeline", e => { 
        console.log(e);
        let el = document.getElementById('bottom-panel');
        if(el)
            el.style.display = 'none';
        
        el = document.getElementById('kf-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('curves-timeline');
        if(el)
            el.style.display = 'none';
        var ctimeline = document.getElementById('clips-timeline');            
        if(ctimeline) {
            ctimeline.style.display = 'block';
            clipsTimeline.resize();
        }
        else {
            clipsTimeline = new LX.ClipsTimeline("clips-timeline", {width: m.root.clientWidth, height: m.parent.root.parentElement.clientHeight - m.root.clientHeight});
            bottom.attach(clipsTimeline.root);
            var clip = {id:"Clip1", start:0, duration:1, type:""};
            clipsTimeline.addClip(clip);
            var clip = {id:"Clip2", start:0, fadein: 0.5, fadeout: 0.8, duration:1, type:""};
            clipsTimeline.addClip(clip);
            var clip = {id:"Clip3", start:0, fadein: 0.5, fadeout: 0.8, duration:1, type:""};
            clipsTimeline.addClip(clip);
            var clip = {id:"Clip4", start:0, fadein: 0.5, fadeout: 0.8, duration:1, type:""};
            clipsTimeline.addClip(clip);
            var clip = {id:"Clip5", start:0, fadein: 0.5, fadeout: 0.8, duration:1, type:""};
            clipsTimeline.addClip(clip);
           
            // clipsTimeline.setAnimationClip({tracks: [{clips: [clip]}], duration: 2});
            clipsTimeline.selectedItems = ["Clip1"];
  
            clipsTimeline.draw(0);
        }
    });

    m.add( "Curves Timeline", e => { 
        console.log(e);
        let el = document.getElementById('bottom-panel');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('kf-timeline');
        if(el)
            el.style.display = 'none';
        el = document.getElementById('clips-timeline');
        if(el)
            el.style.display = 'none';
        
        var timeline = document.getElementById('curves-timeline');
        if(timeline) {
            timeline.style.display = 'block';
            curvesTimeline.resize();
        }
        else {
            curvesTimeline = new LX.CurvesTimeline("curves-timeline", {width: m.root.clientWidth, height: m.parent.root.parentElement.clientHeight - m.root.clientHeight, range: [-1,1]});
            curvesTimeline.setSelectedItems(["Item 1", "Item 2", "Item 3"]);
            curvesTimeline.setAnimationClip({tracks: [{name: "Item 1.position", values: [0,1,0,-1], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 1.scale", values: [0,1,0, 0.5], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 2", values: [0,1,0,1], times: [0.1, 0.2, 0.3, 0.8]}, {name: "Item 3.position", values: [0,0,0,1], times: [0, 0.1, 0.2, 0.3]}, {name: "Item 3.scale", values: [0,1,0], times: [0, 0.1, 0.2, 0.3]}], duration: 1});
            bottom.attach(curvesTimeline.root);
            curvesTimeline.draw(0);
        }
    });

    bottom.onresize = bounding => {
        if(clipsTimeline)
            clipsTimeline.resize(  );
        
        if(kfTimeline)
            kfTimeline.resize();
        
        if(curvesTimeline)
            curvesTimeline.resize();
    }
} );

var bottomPanel = bottom.addPanel({id: "bottom-panel"});
fillBottomPanel( bottomPanel ); 

// split right area
var [rup, rbottom] = right.split({type: 'vertical', sizes:["70%","30%"]});

// Get new content area to fill it
const topTabs = up.addTabs();

// add canvas to left upper part
var canvas = document.createElement('canvas');
canvas.style.width = "100%";
canvas.style.height = "100%";

const resizeCanvas = ( bounding ) => {
    canvas.width = bounding.width;
    canvas.height = bounding.height;
};

topTabs.add( "Canvas", canvas, { selected: true, onCreate: resizeCanvas } );
topTabs.add( "Debug", document.createElement('div'));

// add on resize event to control canvas size
topTabs.area.onresize = resizeCanvas;

topTabs.area.addOverlayButtons( [ 
    [
        {
            name: "Select",
            icon: "fa fa-arrow-pointer",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: "Move",
            icon: "fa-solid fa-arrows-up-down-left-right",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: "Rotate",
            icon: "fa-solid fa-rotate-right",
            callback: (value, event) => console.log(value),
            selectable: true
        }
    ],
    {
        name: "Lit",
        options: ["Lit", "Unlit", "Wireframe"],
        callback: (value, event) => console.log(value)
    },
    [
        {
            name: "Enable Snap",
            icon: "fa fa-table-cells",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: 10,
            options: [10, 100, 1000],
            callback: value => console.log(value)
        }
    ], {
        name: "Button 4",
        // img: "https://webglstudio.org/latest/imgs/mini-icon-gizmo.png",
        icon: "fa fa-cube",
        callback: (value, event) => console.log(value)
    }
], { float: "htc" } );

// add panels
var sidePanel = rup.addPanel();
fillPanel( sidePanel );

const bottomTabs = rbottom.addTabs({ fit: true });
var sideBottomPanel = new LX.Panel();
var sideBottomPanelH = new LX.Panel();
fillRightBottomPanel( sideBottomPanel, 'Vertical' );
fillRightBottomPanel( sideBottomPanelH, 'Horizontal' );

bottomTabs.add( "Panel V", sideBottomPanel );
bottomTabs.add( "Panel H", sideBottomPanelH );

const footer = new LX.Footer( {
    parent: bottomPanel.root,
    columns: [
        {
            title: "LexGUI",
            items: [
                { title: "Download", link: "" },
                { title: "Documentation", link: "" },
                { title: "Web demo", link: "" },
                { title: "Source code", link: "" }
            ]
        },
        {
            title: "Projects",
            items: [
                { title: "Animics", link: "" },
                { title: "Performs", link: "" }
            ]
        },
        {
            title: "Other stuff",
            items: [
                { title: "Some section", link: "" },
                { title: "Just filling", link: "" },
                { title: "No more ideas", link: "" },
            ]
        }
    ],
    credits: `2019-${ new Date().getUTCFullYear() } Alex Rodríguez and contributors. Website source code on GitHub.`,
    socials: [
        { title: "Github", link: "", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512"><path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6.0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6.0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3.0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1.0-6.2-.3-40.4-.3-61.4.0.0-70 15-84.7-29.8.0.0-11.4-29.1-27.8-36.6.0.0-22.9-15.7 1.6-15.4.0.0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5.0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9.0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4.0 33.7-.3 75.4-.3 83.6.0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6.0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9.0-6.2-1.4-2.3-4-3.3-5.6-2z"></path></svg>` },
        { title: "BlueSky", link: "", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M407.8 294.7c-3.3-.4-6.7-.8-10-1.3 3.4.4 6.7.9 10 1.3zM288 227.1C261.9 176.4 190.9 81.9 124.9 35.3 61.6-9.4 37.5-1.7 21.6 5.5 3.3 13.8.0 41.9.0 58.4S9.1 194 15 213.9c19.5 65.7 89.1 87.9 153.2 80.7 3.3-.5 6.6-.9 10-1.4-3.3.5-6.6 1-10 1.4-93.9 14-177.3 48.2-67.9 169.9C220.6 589.1 265.1 437.8 288 361.1c22.9 76.7 49.2 222.5 185.6 103.4 102.4-103.4 28.1-156-65.8-169.9-3.3-.4-6.7-.8-10-1.3 3.4.4 6.7.9 10 1.3 64.1 7.1 133.6-15.1 153.2-80.7C566.9 194 576 75 576 58.4s-3.3-44.7-21.6-52.9c-15.8-7.1-40-14.9-103.2 29.8C385.1 81.9 314.1 176.4 288 227.1z"></path></svg>` },
        { title: "Mastodon", link: "", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M433 179.1c0-97.2-63.7-125.7-63.7-125.7-62.5-28.7-228.6-28.4-290.5.0.0.0-63.7 28.5-63.7 125.7.0 115.7-6.6 259.4 105.6 289.1 40.5 10.7 75.3 13 103.3 11.4 50.8-2.8 79.3-18.1 79.3-18.1l-1.7-36.9s-36.3 11.4-77.1 10.1c-40.4-1.4-83-4.4-89.6-54a102.5 102.5.0 01-.9-13.9c85.6 20.9 158.7 9.1 178.8 6.7 56.1-6.7 105-41.3 111.2-72.9 9.8-49.8 9-121.5 9-121.5zm-75.1 125.2h-46.6V190.1c0-49.7-64-51.6-64 6.9v62.5H201V197c0-58.5-64-56.6-64-6.9v114.2H90.2c0-122.1-5.2-147.9 18.4-175 25.9-28.9 79.8-30.8 103.8 6.1l11.6 19.5 11.6-19.5c24.1-37.1 78.1-34.8 103.8-6.1 23.7 27.3 18.4 53 18.4 175z"></path></svg>` },
        { title: "Discord", link: "", icon: `<a class="fa-brands fa-discord"></a>` },
        { title: "Reddit", link: "", icon: `<a class="fa-brands fa-reddit"></a>` }
    ]
} );

function loop(dt) {
    
    var ctx = canvas.getContext("2d");

    // Get values from panel widgets (e.g. color value)
    ctx.fillStyle = sidePanel.getValue('Background');

    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = sidePanel.getValue('Font Size') + "px Monospace";

    ctx.fillStyle = sidePanel.getValue('Font Color');

    const text = sidePanel.getValue('Text');
    const pos2D = sidePanel.getValue('2D Position');
    ctx.fillText(text, pos2D[0], pos2D[1]);

    if(kfTimeline)
        kfTimeline.draw();

    if(clipsTimeline)
        clipsTimeline.draw();

    if(curvesTimeline)
        curvesTimeline.draw();

    requestAnimationFrame(loop);
}

// createAssetDialog();

requestAnimationFrame(loop);

// **** **** **** **** **** **** **** **** **** **** **** **** 

function fillPanel( panel ) {
    
    // Add data tree

    let sceneData = {
        'id': 'root',
        'children': [
            {
                'id': 'node_1',
                'children': [
                    {
                        'id': 'node_1_1',
                        'icon': 'fa-solid fa-cube',
                        'children': [],
                        'actions': [
                            {
                                'name': 'Open script',
                                'icon': 'fa-solid fa-scroll',
                                'callback': function(node) {
                                    console.log(node.id + ": Script opened!")
                                }
                            }
                        ]
                    }
                ]
            },
            {
                'id': 'node_2',
                'icon': 'fa-solid fa-circle-play',
                'children': []
            }
        ]
    };

    // This is optional!
    const treeIcons = [
        {
            'name':'Add node',
            'icon': 'fa-solid fa-plus',
            'callback': () => { console.log("Node added!") }
        },
        {
            'name':'Instantiate scene',
            'icon': 'fa-solid fa-link',
            'callback': () => { console.log("Scene instantiated!") }
        }
    ];

    window.tree = panel.addTree("Scene Tree", sceneData, { 
        icons: treeIcons, 
        // filter: false,
        addDefault: true,
        onevent: (event) => { 
            console.log(event.string());

            switch(event.type) {
                case LX.TreeEvent.NODE_SELECTED: 
                    if(event.multiple)
                        console.log("Selected: ", event.node); 
                    else
                        console.log(event.node.id + " selected"); 
                    break;
                case LX.TreeEvent.NODE_DELETED: 
                    if(event.multiple)
                        console.log("Deleted: ", event.node); 
                    else
                        console.log(event.node.id + " deleted"); 
                    break;
                case LX.TreeEvent.NODE_DBLCLICKED: 
                    console.log(event.node.id + " dbl clicked"); 
                    break;
                case LX.TreeEvent.NODE_CONTEXTMENU: 
                    const m = event.panel;
                    m.add( "Components/Transform");
                    m.add( "Components/MeshRenderer");
                    break;
                case LX.TreeEvent.NODE_DRAGGED: 
                    console.log(event.node.id + " is now child of " + event.value.id); 
                    break;
                case LX.TreeEvent.NODE_RENAMED:
                    console.log(event.node.id + " is now called " + event.value); 
                    break;
                case LX.TreeEvent.NODE_VISIBILITY:
                    console.log(event.node.id + " visibility: " + event.value); 
                    break;
            }
        }
    });    

    // add widgets to panel branch
    panel.branch("Preferences", {icon: "fa-solid fa-gear"});
    panel.addButton(null, "Show Notifications" + LX.badge("+99", "accent sm"));
    panel.addCounter("Calories Counter ", 350, (v) => { console.log( v + " calories!" ) }, { label: "CALORIES/DAY", max: 500 });
    panel.addButton("Colored Tiny Button", "Click here!", () => {}, { buttonClass: "primary xs" });
    panel.addButton("Colored Small Button", "Click here!", () => {}, { buttonClass: "accent sm" });
    panel.addButton("A Classic Button", "Click here!", () => {}, { buttonClass: "md" });
    panel.addCheckbox("Check me, Please", false, (value, event) => {
        console.log(value);
    }, { className: "secondary" });
    panel.sameLine(2);
    panel.addToggle("Colored Toggle", false, (value, event) => {
        console.log(value);
    }, { className: "accent", nameWidth: "50%" });
    panel.addToggle("Outlined Checkbox ", false, (value, event) => {
        console.log(value);
    }, { className: "secondary outline", nameWidth: "50%" });
    panel.addFile("I'm a File Input", data => { console.log(data) }, { disabled: true } );
    panel.addDropdown("Best Engine", ["Godot", "Unity", "Unreal Engine"], "Unity", (value, event) => {
        console.log(value);
    });
    panel.addDropdown("Best Logo", [{value:"Godot", src: "https://godotengine.org/assets/press/logo_vertical_color_light.png"}, {value: "Unity", src: "https://logos-world.net/wp-content/uploads/2023/01/Unity-Logo.png"}, {value:"Unreal Engine", src: "https://cdn2.unrealengine.com/ue-logo-stacked-unreal-engine-w-677x545-fac11de0943f.png"}], "Godot", (value, event) => {
        console.log(value);
    }, {filter: true});
    panel.addDropdown("Best Gif", [{value:"Godot", src: "https://i.redd.it/4vepr95bye861.gif"}, {value: "Unity", src: "https://i.gifer.com/origin/db/db3cb258e9bbb78c5851a000742e5468_w200.gif"}, {value:"Unreal Engine", src: "https://d3kjluh73b9h9o.cloudfront.net/original/4X/e/0/d/e0deb23c10cc7852c6ab91c28083e27f9c8228f8.gif"}], "Godot", (value, event) => {
        console.log(value);
    }, {filter: true});

    panel.addVector3("Im a Vec3", [0.1, 0.4, 0.5], (value, event) => {
        console.log(value);
    });
    panel.addLayers("Layers", 10, (value, event) => {
        console.log(value);
    });
    panel.addArray("Array", ['GPTeam', 'Blat Panthers', 'Blat Bunny'], (value, event) => {
        console.log(value);
    });
    panel.addTags("Game Tags", "2d, karate, ai, engine, ps5, console", (value, event) => {
        console.log(value);
    });
    panel.addComboButtons("Alignment", [
        {
            value: 'left',
            icon: 'fa fa-align-left',
            callback: (value, event) => {
                console.log(value);
            }
        }, {
            value: 'center',
            icon: 'fa fa-align-center',
            callback: (value, event) => {
                console.log(value);
            }
        }, {
            value: 'right',
            icon: 'fa fa-align-right',
            callback: (value, event) => {
                console.log(value);
            }
        }
    ], {selected: "center"});
    panel.addList(null, ['GPTeam', 'Blat Bunny', ['Blat Panthers', 'fa-solid fa-paw']], 'Blat Panthers',  (value, event) => {
        console.log(value);
    });
    const opacityValues = [
        [0.2, 0.3146875],
        [0.417313915857606, 0.8946875000000003],
        [0.5495145631067961, 0.6746875],
        [1, 1]
    ];
    panel.addCurve("Opacity", opacityValues, (value, event) => {
        console.log(value);
    });
    panel.addPad("2D Pad", [0.5, 0.5], (value, event) => {
        console.log(value);
    }, { padSize: "100px", min: -1, max: 2 });
    panel.addSize("Screen Res", [1280, 720], (value, event) => {
        console.log(value);
    }, { units: "p", precision: 0 });

    // another branch
    panel.branch("Canvas", {icon: "fa-solid fa-palette", filter: true});
    panel.addColor("Background", "#b7a9b1");
    panel.addText("Text", "Lexgui.js @jxarco", null, {placeholder: "e.g. ColorPicker", icon: "fa fa-font"});
    panel.addColor("Font Color", [1, 0.1, 0.6], (value, event) => {
        console.log("Font Color: ", value);
    });
    panel.addNumber("Font Size", 36, (value, event) => {
        console.log(value);
    }, { min: 1, max: 48, step: 1, units: "px"});
    panel.addVector2("2D Position", [250, 350], (value, event) => {
        console.log(value);
    }, { min: 0, max: 1024 });
    panel.addSeparator();
    panel.addTitle("Configuration (Im a title)");
    panel.addCheckbox("Toggle me", true, (value, event) => {
        console.log(value);
    }, { suboptions: (p) => {
        p.addText(null, "Suboption 1");
        p.addNumber("Suboption 2", 12);
    } });
    panel.addFile("Image", data => { console.log(data) }, {} );
    panel.merge();

    // This is outside a branch
    panel.addText("Im out :(", "", null, { placeholder: "Alone..." });
    panel.addVector4("Im a Vec4", [0.3, 0.3, 0.5, 1], (value, event) => {
        console.log(value);
    });
    panel.addButton(null, "Click me, Im Full Width...");
    panel.addButton("Test Button", "Reduced width...");
    panel.addBlank(12);
}

function fillRightBottomPanel( panel, tab ) {
    
    panel.clear();

    panel.branch("Bottom", {icon: "fa-solid fa-table-list"});

    if(tab == 'Horizontal')
    {
        panel.addTabs([
            { 
                name: "First tab",
                icon: "fa-brands fa-discord",
                onCreate: p => {
                    p.addTitle("Discord tab");
                    p.addButton(null, "Connect");
                },
                onSelect: p => {
                    console.log( p );
                }
            },
            { 
                name: "Second tab",
                icon: "fa-brands fa-twitter",
                onCreate: p => {
                    p.addTitle("Twitter tab");
                    p.addText("Tweet", "", null, {placeholder: "Tyler Rake 2"});
                }
            },
            { 
                name: "Third tab",
                icon: "fa-brands fa-github",
                onCreate: p => {
                    p.addTitle("Github tab");
                    p.addButton(null, "Go", () => {window.open("https://github.com/jxarco/lexgui.js/")});
                }
            }
        ], { vertical: false /*, showNames: true */});

        panel.addText(null, "Widgets below are out the tabs", null, { disabled: true })

        // update panel values uising widget name
        panel.addNumber("HeadRoll Value", 0, (value, event) => {
            panel.setValue('HeadRoll', value);
        }, { min: -1, max: 1, step: 0.1 });
        panel.addProgress("HeadRoll", 0, { min: -1, max: 1, low: -0.25, high: 0.25, optimum: 0.75, showValue: true, editable: true, callback: (value, event) => {
            panel.setValue('HeadRoll Value', value);
        } });
    }
    else if(tab == 'Vertical')
    {
        panel.addTabs([
            { 
                name: "First tab",
                icon: "fa-brands fa-discord",
                onCreate: (p, content) => {
                    p.addTitle("Discord tab");
                    p.addButton("Apply", "Add button to branch", (value, event) => {
                        p.queue( content );
                        p.addButton(null, "Hello");
                        p.clearQueue();
                    });
                }
            },
            { 
                name: "Second tab",
                icon: "fa-brands fa-twitter",
                onCreate: p => {
                    p.addTitle("Twitter tab");
                    p.addText("Tweet", "", null, {placeholder: "Tyler Rake 2"});
                }
            },
            { 
                name: "Third tab",
                icon: "fa-brands fa-github",
                onCreate: p => {
                    p.addTitle("Github tab");
                    p.addButton(null, "Go", (value, event) => {window.open("https://github.com/jxarco/lexgui.js/")});
                }
            }
        ]);

        /************** */
        // Custom Widget

        LX.ADD_CUSTOM_WIDGET( "Shader", {
            icon: "fa-cube",
            default: {
                position: [0, 0],
                velocity: [0, 0, 0],
                color: [0, 0, 0, 0],
                hexColor: "#000",
                highRes: false
            }
        });

        const shaderInstance = {
            'hexColor': "#f5f505",
            'highRes': true
        };

        panel.addShader( "A Shader", shaderInstance, (instance) => { console.log(instance) } );
        panel.addShader( "Empty Instance", null );

        /************** */
    }

    panel.merge();
}

function fillBottomPanel( panel ) {
    
    // add widgets to panel branch
    panel.branch("Information", {icon: "fa fa-circle-info"});
    panel.addText("Camera", "Canon EOS 80D", null, {disabled: true}); 
    panel.addText("Text", "Warning text", null, { warning: true });
    const patternOptions = { uppercase: true }
    panel.addText("Text With Validator Pattern", "", (value, event) => {
        console.log(value);
    }, { pattern: LX.buildTextPattern( patternOptions ) });
    panel.addTextArea("Notes", "", (value, event) => {
        console.log(value);
    }, { placeholder: 'Some notes...' });
    panel.addKnob("A Small but disabled Knob", 4, 0, 200, value => { console.log( value ) }, { size: 'sm', disabled: true });
    panel.addKnob("A Knob", 4, 0, 200, value => { console.log( value ) } );
    panel.addKnob("A Big Knob with Snap", 4, 0, 200, value => { console.log( value ) }, { size: 'bg', snap: 4 });
    panel.addButton("Apply", "Add button to branch", (value, event) => {
        const branch = panel.getBranch("Information");
        panel.queue( branch.content );
        panel.addButton(null, "Hello");
        panel.clearQueue();
    });

    panel.branch("A collapsed branch", { closed: true });
    panel.addText(null, "Nothing here", null, { disabled: true });
    panel.merge();
}

function createLoginForm() {

    let dialog = new LX.Dialog('Login', panel => {

        const formData = {
            Username: {
                value: "",
                placeholder: "Enter username",
                icon: "fa fa-user",
                pattern: LX.buildTextPattern( { minLength: 3 } )
            },
            Password: {
                value: "",
                type: "password",
                placeholder: "Enter password",
                icon: "fa fa-key",
                pattern: LX.buildTextPattern( { lowercase: true, uppercase: true, digit: true, minLength: 6 } )
            }
        };

        panel.addForm("Test form", formData, (value, event) => {
            console.log(value);
        }, { actionName: "Login" });

        panel.addLabel( "Or", { float: 'center' } );

        panel.addButton( null, "Sign up", ( value, event ) => { });

    }, { close: true, minimize: false, size: ["25%"], scroll: true, resizable: true, draggable: true });
}

function createAssetDialog() {

    let dialog = new LX.Dialog('Non Manual Features lexemes', (p) => {

        const previewActions = [
            {
                name: 'Print Clip',
                type: 'clip',
                callback: ( item ) => {
                    console.log(item);
                }
            },
            {
                name: 'Print Image',
                type: 'image',
                callback: ( item ) => {
                    console.log(item);
                }
            },
            {
                name: 'Common',
                callback: ( item ) => {
                    console.log(item);
                }
            }
        ];

        var assetView = new LX.AssetView({ 
            skip_browser: true,
            skip_navigation: true,
            preview_actions: previewActions
        });

        p.attach( assetView );
        let assetData = [];
        const values = ['brow_lowerer.png', 'godot_pixelart.png', 'godot_canvas.png' ];

        for(let i = 0; i < values.length; i++){
            let data = {
                id: values[i], 
                type: i == 0 ? "clip" : "image",
                src: "data/" + values[i].toLowerCase(),
            }
            assetData.push(data);
        }

        assetView.load( assetData, (e,v) => {
            switch(e.type) {
                case LX.AssetViewEvent.ASSET_SELECTED: 
                    if(e.multiple)
                        console.log("Selected: ", e.item); 
                    else
                        console.log(e.item.id + " selected"); 
                    break;
                case LX.AssetViewEvent.ASSET_DELETED: 
                    console.log(e.item.id + " deleted"); 
                    break;
                case LX.AssetViewEvent.ASSET_CLONED: 
                    console.log(e.item.id + " cloned"); 
                    break;
                case LX.AssetViewEvent.ASSET_RENAMED:
                    console.log(e.item.id + " is now called " + e.value); 
                    break;
            }
        })
    },{ title:'Lexemes', close: true, minimize: false, size: ["80%"], scroll: true, resizable: true, draggable: true });
}

LX.popup("Hello! I'm a popup :)", null, {position: ["50px", "100px"]});