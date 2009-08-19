/*
  inline styler
 */

var InlineStyler = base2.Base.extend({
	_document: null,

	isStyled: null,
	generateStyleNode: null,

	constructor: function (document, isStyled, generateStyleNode) {
		// references
		this._document = document;

		// styling functions
		this.isStyled = isStyled;
		this.generateStyleNode = generateStyleNode;
	},

	isPartiallyStyled: function (range, root) {
		// search for any styled nodes
		var expandedRange = range.cloneRange(), styler = this;
		RangeUtils.encompassEndpoints(expandedRange, this.isStyled, root);
		return !!(new RangeWalkerIterator(this._document, expandedRange, NodeFilter.SHOW_ELEMENT,
		   function (node) {
			// match styled nodes;
			return styler.isStyled(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
		    })).next();
	},
	
	isWhollyStyled: function (range, root) {
		// search for any text nodes outside styled elements
		var expandedRange = range.cloneRange(), styler = this;
		RangeUtils.encompassEndpoints(expandedRange, this.isStyled, root);
		return !(new RangeWalkerIterator(this._document, expandedRange, NodeFilter.SHOW_TEXT & NodeFilter.SHOW_ELEMENT,
		    function (node) {
			// reject styled trees, skip elements, and accept non-whitespace text nodes
			if (node.nodeType == 1)
				return styler.isStyled(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
			return NodeFilter.FILTER_ACCEPT;
		    })).next();
	},

	applyInlineStyle: function (range, root) {
		// normalize range (lest surroundContents leave 0-length nodes)
		RangeUtils.normalizeRange(range, root);

		// insert bold segment
		var node = this.generateStyleNode(this._document);
		range.surroundContents(node);
		// remove nested styled nodes
		range.selectNodeContents(node);
		this._stripInlineStyle(range);
		
		// merge neighboring nodes with degenerate styles (while preserving selection)
		if (node.previousSibling && this.isStyled(node.previousSibling)) {
			range.setStart(node.previousSibling, DOMUtils.getNodeLength(node.previousSibling));
			node = DOMUtils.combineNodes(node.previousSibling, node);
			range.setEnd(node, DOMUtils.getNodeLength(node));
		}
		if (node.nextSibling && this.isStyled(node.nextSibling))
			DOMUtils.combineNodes(node, node.nextSibling);
	},

	_stripInlineStyle: function (range) {
		// strip styled elements in range
		var styler = this, walker = new CachedIterator(new RangeWalkerIterator(this._document, range, NodeFilter.SHOW_ELEMENT,
		    function (node) {
			return styler.isStyled(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
		    }, this));
		while (node = walker.next()) {
			while (node.firstChild)
				node.parentNode.insertBefore(node.firstChild, node);
			node.parentNode.removeChild(node);
		}
	},
	
	removeInlineStyle: function (range, root) {			
		// splitting styled parents at anchor points
		this._defineDiscreteRangeBoundary(range, root, true);
		this._defineDiscreteRangeBoundary(range, root, false);
		// strip inline styles in range
		this._stripInlineStyle(range);
	},
	
	_defineDiscreteRangeBoundary: function (range, root, bStart) {
		// find parent to split at
		var styler = this, parent = DOMUtils.findMatchingAncestor(
		    bStart ? range.startContainer : range.endContainer,
		    bStart ? range.startOffset : range.endOffset,
		    function (container, offset) { return styler.isStyled(container); }, root);
		    
		// extract content from parent if one is found
		if (parent) {
			var cutRange = this._document.createRange();
			cutRange.selectNode(parent);
			cutRange[bStart ? 'setEnd' : 'setStart'](bStart ? range.startContainer : range.endContainer, bStart ? range.startOffset : range.endOffset);
			RangeUtils.normalizeRangeBoundary(cutRange, parent.parentNode, !bStart);
			if (!cutRange.collapsed)
				parent.parentNode.insertBefore(cutRange.extractContents(), bStart ? parent : parent.nextSibling);
			range[bStart ? 'setStartBefore' : 'setEndAfter'](parent);
		}
	}
});

//[TODO] merge with inline styler?
var BlockedInlineStyler = InlineStyler.extend({
	_BlockIterator: null,
	constructor: function (document, BlockIterator, isStyled, generateStyleNode) {
		this.base(document, isStyled, generateStyleNode);
		this._BlockIterator = BlockIterator;
	},

	isPartiallyStyled: function (range) {
		for (var iterator = new this._BlockIterator(this._document, range), block; block = iterator.next(); ) {
			if (this.base(iterator.getRange(), block))
				return true;
		}
		return false;
	},
	
	isWhollyStyled: function (range) {
		for (var iterator = new this._BlockIterator(this._document, range), block; block = iterator.next(); ) {
			if (!this.base(iterator.getRange(), block))
				return false;
		}
		return true;
	},

	applyInlineStyle: function (range) {
		var ranges = [];
		for (var iterator = new this._BlockIterator(this._document, range), block; block = iterator.next(); ) {
			ranges.push(iterator.getRange());
			this.base(ranges[ranges.length - 1], block);
		}
		if (ranges.length) {
			range.setStart(ranges[0].startContainer, ranges[0].startOffset);
			range.setEnd(ranges[ranges.length - 1].endContainer, ranges[ranges.length - 1].endOffset);
		}
	},
	
	removeInlineStyle: function (range) {
		var ranges = [];
		for (var iterator = new this._BlockIterator(this._document, range), block; block = iterator.next(); ) {
			ranges.push(iterator.getRange());
			this.base(ranges[ranges.length - 1], block);
		}
		if (ranges.length) {
			range.setStart(ranges[0].startContainer, ranges[0].startOffset);
			range.setEnd(ranges[ranges.length - 1].endContainer, ranges[ranges.length - 1].endOffset);
		}
	}	
});

/*
  block iterator
 */

//@abstract
//[TODO] implements iterator
var BlockIterator = CachedIterator.extend({
	// user-supplied functions
	isBlock: null,

	_document: null,
	_range: null,
	constructor: function (document, range) {
		// save properties
		this._document = document;
		this._range = range;
	
		// encompass blocks
		var blockRange = this._range.cloneRange();
		RangeUtils.encompassEndpoints(blockRange, this.isBlock, this._root);
		// pass rangewalker to parent cache
		var iterator = this;
		this.base(new RangeWalkerIterator(this._document, blockRange, NodeFilter.SHOW_ELEMENT,
		    function (node) {
			return iterator.isBlock(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
		    }, this));
	},
	_current: null,
	next: function () {
		this._current = this.base();
		return this._current;
	},
	getRange: function () {
		if (!this._current)
			return null;
			
		// select content inside this block
		var blockRange = this._range.cloneRange();
		blockRange.selectNodeContents(this._current);
		// cutoff at selection endpoints
//[TODO] prevent selecting outside block
		if (blockRange.compareBoundaryPoints(Range.START_TO_START, this._range) < 1)
			blockRange.setStart(this._range.startContainer, this._range.startOffset);
		if (blockRange.compareBoundaryPoints(Range.END_TO_END, this._range) > -1)
			blockRange.setEnd(this._range.endContainer, this._range.endOffset);
		return blockRange;
	}
});

/*
  block styler
 */

var BlockStyler = base2.Base.extend({
	_document: null,
	_BlockIterator: null,

	// user-supplied functions
	isStyled: null,
	styleBlock: null,

	constructor: function (document, BlockIterator, isStyled, styleBlock) {
		// internal properties
		this._document = document;
		this._BlockIterator = BlockIterator;

		// user-supplied functions
		this.isStyled = isStyled;
		this.styleBlock = styleBlock;
	},
//[TODO] make styleBlock preserve ranges? 
	applyBlockStyle: function (range, options) {
		var startContainer = range.startContainer, startOffset = range.startOffset;
		var endContainer = range.endContainer, endOffset = range.endOffset;
		
		// convert blocks
		for (var iterator = new this._BlockIterator(this._document, range), block; block = iterator.next(); ) {
			var newBlock = this.styleBlock(this._document, block, options);
			if (startContainer == block)
				startContainer = newBlock;
			if (endContainer == block)
				endContainer = newBlock;
		}
		
		// restore selection
		range.setStart(startContainer, startOffset);
		range.setEnd(endContainer, endOffset);
	}
});

/*
  styler commands
 */

//[TODO] implements command
var InlineStyleCommand = EditableCommand.extend({
	_styler: null,
	constructor: function (editable, styler) {
		this.base(editable);
		this._styler = styler;
	},
	
	execute: function () {
		// if fully styled, unstyle; else, apply style
		var selection = this._editable.getSelection();
		this._styler.isWhollyStyled(selection) ?
		    this._styler.removeInlineStyle(selection) :
		    this._styler.applyInlineStyle(selection);
		this._editable.setSelection(selection);
	},

	isEnabled: function () {
//[TODO]
		return true;
	}
});

//[TODO] implements command
var BlockStyleCommand = EditableCommand.extend({
	_styler: null,
	constructor: function (editable, styler) {
		this.base(editable);
		this._styler = styler;
	},
	execute: function (options) {
		// for each block
		var selection = this._editable.getSelection();
		this._styler.applyBlockStyle(selection, options || {});
		this._editable.setSelection(selection);
	},

	isEnabled: function () {
//[TODO]
		return true;
	}
});
