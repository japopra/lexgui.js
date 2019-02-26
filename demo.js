
// init library
LexGUI.init();

LexGUI.message("Welcome to Lexgui!", "Not an error!")

// create main area
var area = new LexGUI.Area({id:"mainarea"});

// split main area
area.split({sizes:["70%","30%"]});
var [left,right] = area.sections;

// split left area
left.split({type: 'vertical', sizes:["80vh","20vh"]});
var [up, bottom] = left.sections;

// add canvas to left upper part
var canvas = document.createElement('canvas');
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.backgroundColor = "#ccc";
up.attach( canvas );

var ctx = canvas.getContext("2d");

ctx.font = "12px Monospace";
ctx.fillText("This is a 2d canvas", 74, 60);
ctx.fillText("Lexgui.js @jxarco", 80, 80);

// add panels
var panel = new LexGUI.Panel();
right.attach(panel);
fillPanel( panel );
fillPanel( panel );


// **** **** **** **** **** **** **** **** **** **** **** **** 


function fillPanel( panel ) {
    
    // add widgets to panel branch
    panel.branch("Information");
    panel.addText("Camera", "Canon EOS 80D", null,{disabled: true}); 
    panel.addText("Serial number", "194E283DD");
    panel.merge();

    // add widgets to panel directly
    // add title?
    panel.addText(null, "This does not have name");

    // another branch
    panel.branch("Preferences");
    panel.addText("Browser", "Chrome");
    panel.addText("Extensions", "", null, {placeholder: "e.g. ColorPicker"});
    panel.addText(null, "This has a console.log callback", function(value, event){
        console.log(value, event);
    });
    panel.addButton(null, "Apply changes");
    panel.addButton("Apply", "Print event", function(event){
        console.log(event);
    });
    panel.merge();

    panel.branch("A collapsed branch", {closed: true});
    panel.addText(null, "Nothing here", null, {disabled: true});
    panel.merge();

    panel.addButton(null, "Restart");

    // another branch
    panel.branch("Other things");
    panel.addCombo("Pages", ["Federico", "Garcia", "Lorca"], function(value, event){
        console.log(value);
    });
    panel.addCheckbox("Enable", true, function(value, event){
        console.log(value.target.checked);
    });
    panel.addCheckbox("This is disabled", true, null, {disabled: true});
    panel.merge();
}





