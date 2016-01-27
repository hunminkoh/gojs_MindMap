function init() {
    var $ = go.GraphObject.make;  // for conciseness in defining templates
    myDiagram =
      $(go.Diagram, "myDiagram",  // must name or refer to the DIV HTML element
        {
          initialContentAlignment: go.Spot.Center,
          allowDrop: true,  // must be true to accept drops from the Palette
          // mouse wheel zooms instead of scrolls
          //http://gojs.net/latest/api/symbols/Diagram.html#scroll
          "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,


         // replace the standard DragSelectingTool with one that selects while dragging,
         // and also only requires overlapping bounds with the dragged box to be selected
         //http://gojs.net/latest/extensions/RealtimeDragSelecting.html
         dragSelectingTool:
           $(RealtimeDragSelectingTool,

             { isPartialInclusion: true, delay: 400 },
             { box: $(go.Part,  // replace the magenta box with a red one
                      { layerName: "Tool", selectable: false },
                      $(go.Shape,
                        { name: "SHAPE", fill: "rgba(255,0,0,0.1)",
                          stroke: "red", strokeWidth: 2 })) }

           ),

          "draggingTool.dragsLink": true,
          "draggingTool.isGridSnapEnabled": false,
          "linkingTool.isUnconnectedLinkValid": false,
          "linkingTool.portGravity": 20,
          "relinkingTool.isUnconnectedLinkValid": false,
          "relinkingTool.portGravity": 20,
          "relinkingTool.fromHandleArchetype":
            $(go.Shape, "Diamond", { segmentIndex: 0, cursor: "pointer", desiredSize: new go.Size(8, 8), fill: "tomato", stroke: "darkred" }),
          "relinkingTool.toHandleArchetype":
            $(go.Shape, "Diamond", { segmentIndex: -1, cursor: "pointer", desiredSize: new go.Size(8, 8), fill: "darkred", stroke: "tomato" }),
          "linkReshapingTool.handleArchetype":
            $(go.Shape, "Diamond", { desiredSize: new go.Size(7, 7), fill: "lightblue", stroke: "deepskyblue" }),
          rotatingTool: $(TopRotatingTool),  // defined below
          "rotatingTool.snapAngleMultiple": 15,
          "rotatingTool.snapAngleEpsilon": 15,
          // don't set some properties until after a new model has been loaded
          "InitialLayoutCompleted": loadDiagramProperties,  // this DiagramEvent listener is defined below
          "undoManager.isEnabled": true
        });

    myDiagram.scrollMode = go.Diagram.InfiniteScroll;
    //http://gojs.net/latest/samples/scrollModes.html

    // when the document is modified, add a "*" to the title and enable the "Save" button
    myDiagram.addDiagramListener("Modified", function(e) {
      var button = document.getElementById("SaveButton");
      if (button) button.disabled = !myDiagram.isModified;
      var idx = document.title.indexOf("*");
      if (myDiagram.isModified) {
        if (idx < 0) document.title += "*";
      } else {
        if (idx >= 0) document.title = document.title.substr(0, idx);
      }
    });

    myDiagram.addDiagramListener("BackgroundDoubleClicked",function(e) {
      //http://gojs.net/latest/intro/events.html
      //http://gojs.net/latest/api/symbols/DiagramEvent.html
      //http://gojs.net/latest/api/symbols/Diagram.html#addDiagramListener
      //showMessage("Double-clicked at " + e.diagram.lastInput.documentPoint);
      backgroundDoubleClick(e)
    });

    // Define a function for creating a "port" that is normally transparent.
    // The "name" is used as the GraphObject.portId, the "spot" is used to control how links connect
    // and where the port is positioned on the node, and the boolean "output" and "input" arguments
    // control whether the user can draw links from or to the port.
    function makePort(name, spot, output, input) {
      // the port is basically just a small transparent square
      return $(go.Shape, "Circle",
               {
                  fill: null,  // not seen, by default; set to a translucent gray by showSmallPorts, defined below
                  stroke: null,
                  desiredSize: new go.Size(7, 7),
                  alignment: spot,  // align the port on the main Shape
                  alignmentFocus: spot,  // just inside the Shape
                  portId: name,  // declare this object to be a "port"
                  fromSpot: spot, toSpot: spot,  // declare where links may connect at this port
                  fromLinkable: output, toLinkable: input,  // declare whether the user may draw links to/from here
                  cursor: "pointer"  // show a different cursor to indicate potential link point
               });
    }
    var nodeSelectionAdornmentTemplate =
      $(go.Adornment, "Auto",
        $(go.Shape, { fill: null, strokeWidth: 1.5, strokeDashArray: [4, 2] }),
        $(go.Placeholder)
      );
    var nodeResizeAdornmentTemplate =
      $(go.Adornment, "Spot",
        { locationSpot: go.Spot.Right },
        $(go.Placeholder),
        $(go.Shape, { alignment: go.Spot.TopLeft, cursor: "nw-resize", desiredSize: new go.Size(6, 6), fill: "lightgray", stroke: "lightgray" }),
        $(go.Shape, { alignment: go.Spot.Top, cursor: "n-resize", desiredSize: new go.Size(6, 6), fill: "lightgray", stroke: "lightgray" }),
        $(go.Shape, { alignment: go.Spot.TopRight, cursor: "ne-resize", desiredSize: new go.Size(6, 6), fill: "lightgray", stroke: "lightgray" }),
        $(go.Shape, { alignment: go.Spot.Left, cursor: "w-resize", desiredSize: new go.Size(6, 6), fill: "lightgray", stroke: "lightgray" }),
        $(go.Shape, { alignment: go.Spot.Right, cursor: "e-resize", desiredSize: new go.Size(6, 6), fill: "lightgray", stroke: "lightgray" }),
        $(go.Shape, { alignment: go.Spot.BottomLeft, cursor: "se-resize", desiredSize: new go.Size(6, 6), fill: "lightgray", stroke: "lightgray" }),
        $(go.Shape, { alignment: go.Spot.Bottom, cursor: "s-resize", desiredSize: new go.Size(6, 6), fill: "lightgray", stroke: "lightgray" }),
        $(go.Shape, { alignment: go.Spot.BottomRight, cursor: "sw-resize", desiredSize: new go.Size(6, 6), fill: "lightgray", stroke: "lightgray" })
      );
    var nodeRotateAdornmentTemplate =
      $(go.Adornment,
        { locationSpot: go.Spot.Center, locationObjectName: "CIRCLE" },
        $(go.Shape, "Circle", { name: "CIRCLE", cursor: "pointer", desiredSize: new go.Size(7, 7), fill: "lightgray", stroke: "lightgray" }),
        $(go.Shape, { geometryString: "M3.5 7 L3.5 30", isGeometryPositioned: true, stroke: "lightgray", strokeWidth: 1.5, strokeDashArray: [4, 2] })
      );
    myDiagram.nodeTemplate =
      $(go.Node, "Spot",
        { doubleClick: nodeDoubleClick },
        { locationSpot: go.Spot.Center },

        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        // go.Point.parse : convert string into a Point value
        //http://gojs.net/latest/intro/dataBinding.html

        { selectable: true, selectionAdornmentTemplate: nodeSelectionAdornmentTemplate },
        { resizable: true, resizeObjectName: "PANEL", resizeAdornmentTemplate: nodeResizeAdornmentTemplate },
        { rotatable: true, rotateAdornmentTemplate: nodeRotateAdornmentTemplate },

        new go.Binding("angle").makeTwoWay(),
        // the main object is a Panel that surrounds a TextBlock with a Shape
        $(go.Panel, "Auto",
          { name: "PANEL" },
          new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
          $(go.Shape, "RoundedRectangle",  // default figure
            {
              //width: 150, height: 60, margin: 4,
              portId: "", // the default port: if no spot on link data, use closest side
              fromLinkable: true, toLinkable: true, cursor: "pointer",
              fill: "white"  // default color
            },
            new go.Binding("figure"),
            new go.Binding("fill")),

          $(go.TextBlock,
            {
              font: "bold 11pt Helvetica, Arial, sans-serif",
              margin: 8,
              maxSize: new go.Size(160, NaN),
              wrap: go.TextBlock.WrapFit,
              editable: true
            },
            new go.Binding("text").makeTwoWay())
        ),
        // four small named ports, one on each side:
      //  makePort("C", go.Spot.Center, false, true),
        /*
        makePort("T", go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, true, true),
        makePort("R", go.Spot.Right, true, true),
        makePort("B", go.Spot.Bottom, true, false),*/
        { // handle mouse enter/leave events to show/hide the ports
          mouseEnter: function(e, node) { showSmallPorts(node, true); },
          mouseLeave: function(e, node) { showSmallPorts(node, false); }
        }
      );/*
      */

    function nodeDoubleClick(e, obj) {
      var clicked = obj.part;
      if (clicked !== null) {
        var thisnode = clicked.data;
        myDiagram.startTransaction("add node");
        var nextkey = (myDiagram.model.nodeDataArray.length + 1).toString();

        var splitloc = thisnode.loc.split(/[ ]+/);
        var newX = parseFloat(splitloc[0])-10;
        var newY = parseFloat(splitloc[1])-10;
        var newnode = {text:"Comment", key: nextkey, parent: thisnode.key,
        loc: newX+" "+newY };

        var newlink = {from: thisnode.key, to: newnode.key };
        myDiagram.model.addLinkData(newlink);
        myDiagram.model.addNodeData(newnode);

        myDiagram.commitTransaction("add node");


      }
    }

    function backgroundDoubleClick(e) {

      myDiagram.startTransaction("add node");
      var nextkey = (myDiagram.model.nodeDataArray.length + 1).toString();

      var newnode = {text:"Comment", key: nextkey,
      loc: e.diagram.lastInput.documentPoint.x+" "+e.diagram.lastInput.documentPoint.y };

      myDiagram.model.addNodeData(newnode);
      myDiagram.commitTransaction("add node");

    }

    function showSmallPorts(node, show) {
      node.ports.each(function(port) {
        if (port.portId !== "") {  // don't change the default port, which is the big shape
          port.fill = show ? "rgba(0,0,0,.3)" : null;
        }
      });
    }
    var linkSelectionAdornmentTemplate =
      $(go.Adornment, "Link",
        $(go.Shape,
          // isPanelMain declares that this Shape shares the Link.geometry
          { isPanelMain: true, fill: null, stroke: "lightgray", strokeWidth: 0 })  // use selection object's strokeWidth
      );


    myDiagram.linkTemplate =
      $(go.Link,  // the whole link panel
        { selectable: true, selectionAdornmentTemplate: linkSelectionAdornmentTemplate },
        { relinkableFrom: true, relinkableTo: true, reshapable: true },
        {
          routing: go.Link.Normal,
        },
        new go.Binding("points").makeTwoWay(),
        $(go.Shape,  // the link path shape
          { isPanelMain: true, strokeWidth: 2 }),

        $(go.Panel, "Auto",
          new go.Binding("visible", "isSelected").ofObject(),
          $(go.Shape, "RoundedRectangle",  // the link shape
            { fill: "transparent", stroke: null }),
          $(go.TextBlock,
            {
              textAlign: "center",
              font: "10pt helvetica, arial, sans-serif",
              stroke: "#919191",
              margin: 2,
              minSize: new go.Size(10, NaN),
              editable: true
            },
            new go.Binding("text").makeTwoWay())
        )
      );
    load();  // load an initial diagram from some JSON text
  }


  function TopRotatingTool() {
    go.RotatingTool.call(this);
  }
  go.Diagram.inherit(TopRotatingTool, go.RotatingTool);
  /** @override */
  TopRotatingTool.prototype.updateAdornments = function(part) {
    go.RotatingTool.prototype.updateAdornments.call(this, part);
    var adornment = part.findAdornment("Rotating");
    if (adornment !== null) {
      adornment.location = part.rotateObject.getDocumentPoint(new go.Spot(0.5, 0, 0, -30));  // above middle top
    }
  };
  /** @override */
  TopRotatingTool.prototype.rotate = function(newangle) {
    go.RotatingTool.prototype.rotate.call(this, newangle + 90);
  };
  // end of TopRotatingTool class
  // Show the diagram's model in JSON format that the user may edit
  function save() {
    saveDiagramProperties();  // do this first, before writing to JSON
    document.getElementById("mySavedModel").value = myDiagram.model.toJson();
    myDiagram.isModified = false;
  }
  function load() {
    myDiagram.model = go.Model.fromJson(document.getElementById("mySavedModel").value);
    // loadDiagramProperties gets called later, upon the "InitialLayoutCompleted" DiagramEvent
  }
  function saveDiagramProperties() {
    myDiagram.model.modelData.position = go.Point.stringify(myDiagram.position);
  }
  // Called by "InitialLayoutCompleted" DiagramEvent listener, NOT directly by load()!
  function loadDiagramProperties(e) {
    var pos = myDiagram.model.modelData.position;
    if (pos) myDiagram.position = go.Point.parse(pos);
  }
