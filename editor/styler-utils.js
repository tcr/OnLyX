/*
  DOM utilities
 */

 //[TODO] remove the useless ones
var DOMUtils = {
        findChildPosition: function (node) {
                for (var i = 0; node = node.previousSibling; i++)
                        continue;
                return i;
        },
        isDataNode: function (node) {
//[TODO] remove isNull check?
		if (node == null)
			return;
		var type = node.nodeType;
                return type == 3 || type == 4 || type == 8;
        },
        isAncestorOf: function (parent, node) {
		return parent.compareDocumentPosition(node) & 0x08;
        },
        isAncestorOrSelf: function (root, node) {
                return DOMUtils.isAncestorOf(root, node) || root == node;
        },
        getNodeLength: function (node) {
                return DOMUtils.isDataNode(node) ? node.length : node.childNodes.length;
        },
	isWhitespaceNode: function (node) {
		return DOMUtils.isDataNode(node) ? !!node.data.match(/^\s+$/) : false;
	},
	combineNodes: function (node, sibling, copyAttrs) {
		while (sibling.firstChild)
			node.appendChild(sibling.firstChild);
		sibling.parentNode.removeChild(sibling);
		if (copyAttrs) {
//[TODO] this may require base2.DOM
			for (var i = 0; i < sibling.attributes.length; i++)
				node.setAttribute(sibling.attributes[i].name, sibling.attributes[i].value);
		}
		return node;
	},
	findMatchingAncestor: function (container, offset, match, root) {
		while (container && container != root && !match(container, offset)) {
			offset = DOMUtils.findChildPosition(container);
			container = container.parentNode;
		}
		return container && container != root && match(container, offset) ? container : null;
	}
};

/*
  range utilities
 */

var RangeUtils = {
	encompassEndpoints: function (range, match, root) {
		// expand anchors to encompass degenerate styled elements
		var ancestor;
		if (ancestor = DOMUtils.findMatchingAncestor(range.startContainer, range.startOffset, match, root))
			range.setStartBefore(ancestor);
		if (ancestor = DOMUtils.findMatchingAncestor(range.endContainer, range.endOffset, match, root))
			range.setEndAfter(ancestor);
	},
	normalizeRange: function (range, root) {
		RangeUtils.normalizeRangeBoundary(range, root, true);
		RangeUtils.normalizeRangeBoundary(range, root, false);
	},
	normalizeRangeBoundary: function (range, root, bStart) {
		function hasPrecedingContent(container, offset) {
			return DOMUtils.findChildPosition(container) > 0;
		}
		function hasSucceedingContent(container, offset) {
			return DOMUtils.findChildPosition(container) < DOMUtils.getNodeLength(container.parentNode);
		}
		
		// get boundary references
		var pre = bStart ? 'start' : 'end', Pre = bStart ? 'Start' : 'End';
		var container = pre + 'Container', offset = pre + 'Offset';
		var before = 'set' + Pre + 'Before', after = 'set' + Pre + 'After';
		// find anchors
		if (range[offset] == 0)
			range[before](DOMUtils.findMatchingAncestor(range[container], range[offset], hasPrecedingContent, root) || root.firstChild);
		else if (range[offset] >= DOMUtils.getNodeLength(range[container]))
			range[after](DOMUtils.findMatchingAncestor(range[container], range[offset], hasSucceedingContent, root) || root.lastChild);
	},

//[TODO] temporary
	log: function (range, text) {
		console.group(text || 'Range');
		console.log('Start Container:', range.startContainer, ' @ offset: ', range.startOffset);
		console.log('End Container:', range.endContainer, ' @ offset: ', range.endOffset);
		console.log('Common ancestor container: ', range.commonAncestorContainer);
		console.groupEnd(text || 'Range');
	}
};

/*
  range walker iterator
 */

var RangeWalkerIterator = base2.Base.extend({
	_walker: null,
	_current: null,
	_end: null,
	getWalker: function () { return this._walker; },

	constructor: function (document, range, filter, customFilter) {
		// get anchors
		var startContainer = range.startContainer, startOffset = range.startOffset;
		var endContainer = range.endContainer, endOffset = range.endOffset;
		// expand range to wholly encompass text nodes, omitting empty text nodes
//[TODO] use normalize function?
		if (DOMUtils.isDataNode(startContainer)) {
			startOffset = DOMUtils.findChildPosition(startContainer) + (startOffset >= startContainer.length);
			startContainer = startContainer.parentNode;
		}
		if (DOMUtils.isDataNode(endContainer)) {
			endOffset = DOMUtils.findChildPosition(endContainer) + 1 - (endOffset == 0);
			endContainer = endContainer.parentNode;
		}
		
		// create walker
		this._walker = document.createTreeWalker(document, filter || NodeFilter.SHOW_ALL, customFilter, false);

		// initialize positions
		this._walker.currentNode = this._getAnchorAt(startContainer, startOffset);
		this._end = this._getAnchorAt(endContainer, endOffset);
	},
	_getAnchorAt: function (container, offset) {
		var node = container;
		if (offset > 0) {
			node = container.childNodes[offset - 1];
			while (node.lastChild)
				node = node.lastChild;
		}
		return node;
	},
	next: function () {
		// find next node
		var next = this._walker.nextNode();
		// don't return expired nodes
		if (this.isDone())
			return null;
		return next;
	},
	isDone: function () {
		return this._walker.currentNode &&
		    this._walker.currentNode.compareDocumentPosition(this._end) & 0x02;
	}
});

/*
  iterator cache
 */

var CachedIterator = base2.Base.extend({
	_cache: null,
	constructor: function (iterator) {
		this._cache = [];
		for (var item; item = iterator.next(); )
			this._cache.push(item);
	},
	next: function () {
		return this._cache.shift();
	}
});

