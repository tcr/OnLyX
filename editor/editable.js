/*
  Editable class
 */
 
var Editable = base2.Base.extend({
	/*
	  constructor
	 */
	
	constructor: function (node, window) {
		// save document references
		this._node = base2.DOM.bind(node);
		this._document = this._node.ownerDocument;
		this._window = window;
		
		// enable node editing
		this._node.contentEditable = true;
		// setup input handlers
		this._initInputHandlers();
	},

	/*
	  document references
	 */

	_node: null,
	_document: null,
	_window: null,
	
	getNode: function () {
		return this._node;
	},
	
	/*
	  input events
	 */
	
	_listeners: [],
	
	addInputListener: function (listener) {
		this._listeners.push(listener);
	},
	
//	removeEventListener: function (name, listener) {
//	},

	dispatchInputEvent: function (type, data) {
		// create event
		var event = new InputEvent(this, type, data);
		for (var i = 0; i < this._listeners.length && event._propagate; i++)
			this._listeners[i](event);
		return event;
	},
	
	_initInputHandlers: function () {
		// set content handlers
		var closure = this;
		this._node.addEventListener('keypress', function (e) {
			// screen input by key type
			if (e.metaKey || e.altKey || (!e.charCode && e.keyCode != 13))
				return;
			// get key and prevent default action
			var charCode = e.charCode || e.keyCode;

			// create data object
			var data = new DataCollection();
			data.setData('text/plain', String.fromCharCode(charCode));
			data.setData('text/html', '&#' + charCode + ';');
			
			// dispatch event
			var inputEvent = closure.dispatchInputEvent('keyboard', data);
			// default action
			if (!inputEvent._default)
				e.preventDefault();
		}, true);
		this._node.addEventListener('dragdrop', function (e) {
//[TODO]
			e.stopPropagation();
		}, true);
		this._node.addEventListener('paste', function (e) {
//[TODO]
			e.preventDefault();
		}, true);
	},
	
	/*
	  input
	 */
	
	inputData: function (dataContent, type, range, target) {
		var data = new DataCollection();
		data.setData(type, dataContent);
		this.dispatchInputEvent('script', data, target, range);
/*
		if (event._default) {
			range.deleteContents();
			var content = data.getData('text/html') || data.getData('text/plain') || '';
			var frag = range.createContextualFragment(content);
			var last = frag.lastChild
			range.insertNode(frag);
			range.setEndAfter(last);
			// position cursor
			range.collapse(false);
			e.view.getSelection().removeAllRanges();
			e.view.getSelection().addRange(range);
		}*/
	},
	
	/*
	  selection
	 */
	
	getSelection: function () {
		//[NOTE] we clone by default to match webkit/mozilla implementations
		var sel = this._window.getSelection();
		return sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
	},
	
	setSelection: function (range) {
		var sel = this._window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	},
	
	/*
	  contents
	 */
	
	exportContents: function () {
		var range = this._document.createRange();
		range.selectNodeContents(this._node);
		return range.extractContents();
	},
	
	importContents: function (contents) {
		var range = this._document.createRange();
		range.selectNodeContents(this._node);
		range.insertNode(contents);
	},
	
	/*
	  focus
	 */
	
	focus: function () {
		this._node.focus();
	},
	
	blur: function () {
		this._node.blur();
	}
});

/*
  data collection
 */

var DataCollection = base2.Base.extend({	
	_cache: {},
	_cleanFormat: function (format) {
		return format == 'Text' ? 'text/plain' : format == 'URL' ? 'text/uri-list' : format;
	},
	getData: function (format) {
		return this._cache[this._cleanFormat(format)];
	},
	setData: function (format, data) {
		this._cache[this._cleanFormat(format)] = data;
	},
	clearData: function (format) {
		if (!format)
			this._cache = {};
		delete this._cache[this._cleanFormat(format)];
	}
});

/*
  input event
 */

var InputEvent = base2.Base.extend({
	type: '',
	inputData: null,
	target: null,
	selection: null,
	constructor: function (editable, type, data) {
		this.type = type;
		this.inputData = data;
		this.target = editable.getNode();
		this.selection = editable.getSelection();
	},
	
	_propagate: true,
	stopPropagation: function () {
		this._propagate = false;
	},
	_default: true,
	preventDefault: function () {
		this._default = false;
	}
});

/*
  Command implementation
 */

//[TODO] make these two abstract
var EditableCommand = base2.Base.extend({
	_editable: null,
	constructor: function (editable) {
		this._editable = editable;
	},	

	execute: function () { },
//[TODO] isApplicable?
	isEnabled: function () { return false; }
});
