/*
  HTML stylers
 */

//[TODO] implements iterator
var HTMLBlockIterator = BlockIterator.extend({
	isBlock: function (block) {
		return !!block.nodeName.match(/^(blockquote|dt|dd|li|div|h[1-6]|p|pre)$/i);
	}
});

//@abstract
var HTMLInlineStyler = BlockedInlineStyler.extend({
	_BlockIterator: HTMLBlockIterator,

	// extendable functions
	isStyled: null,
	generateStyleNode: null,
	
	constructor: function (document) {
		this._document = document;
	}
});

//@abstract
var HTMLBlockStyler = BlockStyler.extend({
	_BlockIterator: HTMLBlockIterator,

	// extendable functions
	isStyled: null,
	generateStyleNode: null,
	
	constructor: function (document) {
		this._document = document;
	},
	isBlock: function (node) {
		return !!node.nodeName.match(/^(blockquote|dt|dd|div|li|h[1-6]|p|pre)$/i);
	},
	styleBlock: function (document, block, options) {
		// break out of lists
		this._breakOutOfLists(block);
		
		// create new block			
		var newBlock = this.generateStyleNode(document, options);
		block.parentNode.insertBefore(newBlock, block);
		DOMUtils.combineNodes(newBlock, block, true);
		// return formatted block
		return newBlock;
	},
	_breakOutOfLists: function (block) {
		// only applies to list items
		if (!block.nodeName.match(/^(li|dt|dd)$/i) || !block.parentNode.nodeName.match(/^[oud]l$/i))
			return;
			
		// break out of lists
		var list = block.parentNode;
		var index = DOMUtils.findChildPosition(block);
		// create a cloned list to move split content
		if (index > 0) {
			var prevList = list.cloneNode(false);
			for (; index > 0; index--)
				prevList.appendChild(list.firstChild);
			list.parentNode.insertBefore(prevList, list);
		}
		
		// move list item out
		list.parentNode.insertBefore(block, list);
		// delete empty lists
		if (!list.childNodes.length)
			list.parentNode.removeChild(list);
	},
});

//BlockStyleCommand.implement(EditableCommand);

//@abstract
var HTMLListStyler = HTMLBlockStyler.extend({
	// extendable functions
	isStyled: null,
	generateStyleNode: null,
	generateListNode: null,
	
	styleBlock: function (document, block, options) {
		// convert to list item
		var item = this.base(document, block, options);

		// wrap in list and combine lists
		var list = this.generateListNode(document, options);
		item.parentNode.replaceChild(list, item);
		list.appendChild(item);
		this._combineNeighboringLists(list);
		// return formatted block
		return item;
	},
	
	_combineNeighboringLists: function (list) {
		// find preceding, degenerate lists
		var prev = list.previousSibling;
		while (prev && DOMUtils.isWhitespaceNode(prev))
			prev = prev.previousSibling;
		if (prev && prev.nodeName == list.nodeName)
			list = DOMUtils.combineNodes(prev, list);

		// find succeeding, degenerate lists
		var next = list.nextSibling;
		while (next && DOMUtils.isWhitespaceNode(next))
			next = next.nextSibling;
		if (next && next.nodeName == list.nodeName)
			DOMUtils.combineNodes(list, next);
	}
});

/*
  inline commands
 */

var BoldStyler = HTMLInlineStyler.extend({
	isStyled: function (node) {
		return !!node.nodeName.match(/^(strong|b)$/i);
	},
	generateStyleNode: function (document) {
		return document.createElement('b');
	}
});

var ItalicStyler = HTMLInlineStyler.extend({
	isStyled: function (node) {
		return !!node.nodeName.match(/^(em|i)$/i);
	},
	generateStyleNode: function (document) {
		return document.createElement('i');
	}
});

/*
  block commands
 */

var ParagraphStyler = HTMLBlockStyler.extend({
	isStyled: function (node) {
		return !!node.nodeName.match(/^p$/i);
	},
	generateStyleNode: function (document, options) {
		return document.createElement('p');
	}
});

var HeadingStyler = HTMLBlockStyler.extend({
	isStyled: function (node) {
		return !!node.nodeName.match(/^h1$/i);
	},
	generateStyleNode: function (document, options) {
		return document.createElement('h' + (options.level || 1));
	}
});

var OrderedListStyler = HTMLListStyler.extend({
	isStyled: function (node) {
		return !!node.nodeName.match(/^li$/i) && !!node.parentNode.nodeName.match(/^ol$/i);
	},
	generateStyleNode: function (document, options) {
		return document.createElement('li');
	},
	generateListNode: function (document, options) {
		return document.createElement('ol');
	}
});

var UnorderedListStyler = HTMLListStyler.extend({
	isStyled: function (node) {
		return !!node.nodeName.match(/^li$/i) && !!node.parentNode.nodeName.match(/^ul$/i);
	},
	generateStyleNode: function (document, options) {
		return document.createElement('li');
	},
	generateListNode: function (document, options) {
		return document.createElement('ul');
	}
});