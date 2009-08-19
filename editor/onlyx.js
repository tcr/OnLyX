eval(base2.namespace);

/*
  Serializer
 */
 
var Serializer = Base.extend({
	serializeElement: function (node) {
		return node.hasAttribute('data-onlyx-serializer') ?
		    serializers[node.getAttribute('data-onlyx-serializer')](this, node) :
		    this.serializeChildren(node);
	},
	serializeText: function (node) {
//[TODO] escape this latex-style
		return node.data;
	},
	serializeChildren: function (node) {
		var content = '';
		for (var i = 0; i < node.childNodes.length; i++)
			if (node.childNodes[i].nodeType == 1)
				content += this.serializeElement(node.childNodes[i]);
			else if (node.childNodes[i].nodeType == 3)
				content += this.serializeText(node.childNodes[i]);
		return content;
	}
});

var serializers = {
	/*
	  environments
	 */
	 
	'environment-Standard': function (serializer, node) {
		return serializer.serializeChildren(node) + '\n\n';
	},
	
	// lists
	
	'environment-Itemize': function (serializer, node) {
		return '\\item ' + serializer.serializeChildren(node) + '\n';
	},
	'environment-Itemize-list': function (serializer, node) {
		return '\\begin{itemize}\n' + serializer.serializeChildren(node) + '\\end{itemize}\n\n';
	},
	'environment-Enumerate': function (serializer, node) {
		return '\\item ' + serializer.serializeChildren(node) + '\n';
	},
	'environment-Enumerate-list': function (serializer, node) {
		return '\\begin{enumerate}\n' + serializer.serializeChildren(node) + '\\end{enumerate}\n\n';
	},
	
	// sections
	
	'environment-Part': function (serializer, node) {
		return '\\part{' + serializer.serializeChildren(node) + '}\n';
	},
	'environment-Section': function (serializer, node) {
		return '\\section{' + serializer.serializeChildren(node) + '}\n';
	},
	'environment-Subsection': function (serializer, node) {
		return '\\subsection{' + serializer.serializeChildren(node) + '}\n';
	},
	'environment-Subsubsection': function (serializer, node) {
		return '\\subsubsection{' + serializer.serializeChildren(node) + '}\n';
	},
	'environment-Paragraph': function (serializer, node) {
		return '\\paragraph{' + serializer.serializeChildren(node) + '}\n';
	},
	'environment-Subparagraph': function (serializer, node) {
		return '\\subparagraph{' + serializer.serializeChildren(node) + '}\n';
	},
	
	/*
	  fonts
	 */
	
	'font-Bold': function (serializer, node) {
		return '\\textbf{' + serializer.serializeChildren(node) + '}';
	}
};

/*
  Stylers
 */

var EnvironmentStyler = HTMLBlockStyler.extend({
	// user-defined
	environment: '',
	
	isStyled: function (node) {
		return node.getAttribute('data-onlyx-type') == 'environment' &&
		    node.getAttribute('data-onlyx-environment') == this.environment;
	},
	styleBlock: function (document, originalNode, options) {
		var node = this.base(document, originalNode, options);
		node.setAttribute('class', String(node.getAttribute('class')).replace(/\bonlyx-environment-\w+\b/, ''));
		node.setAttribute('class', node.getAttribute('class') + ' onlyx-environment-' + this.environment);
		node.setAttribute('data-onlyx-type', 'environment');
		node.setAttribute('data-onlyx-environment', this.environment);
		node.setAttribute('data-onlyx-serializer', 'environment-' + this.environment);
		return node;
	}	
});

var EnvironmentListStyler = HTMLListStyler.extend({
	// user-defined
	environment: '',
	
	isStyled: function (node) {
		return node.getAttribute('data-onlyx-type') == 'environment' &&
		    node.getAttribute('data-onlyx-environment') == this.environment;
	},
	styleBlock: function (document, originalNode, options) {
		var node = this.base(document, originalNode, options);
		node.setAttribute('class', String(node.getAttribute('class')).replace(/\bonlyx-environment-\w+\b/, ''));
		node.setAttribute('class', node.getAttribute('class') + ' onlyx-environment-' + this.environment);
		node.setAttribute('data-onlyx-type', 'environment');
		node.setAttribute('data-onlyx-environment', this.environment);
		node.setAttribute('data-onlyx-serializer', 'environment-' + this.environment);
		node.parentNode.setAttribute('data-onlyx-serializer', 'environment-' + this.environment + '-list');
		return node;
	}	
});

var environments = {
	Standard: EnvironmentStyler.extend({
		environment: 'Standard',
		generateStyleNode: function (document, options) {
			return document.createElement('p');
		}
	}),
	
	// list
	Itemize: EnvironmentListStyler.extend({
		environment: 'Itemize',
		generateStyleNode: function (document, options) {
			return document.createElement('li');
		},
		generateListNode: function (document, options) {
			return document.createElement('ul');
		}
	}),
	Enumerate: EnvironmentListStyler.extend({
		environment: 'Enumerate',
		generateStyleNode: function (document, options) {
			return document.createElement('li');
		},
		generateListNode: function (document, options) {
			return document.createElement('ol');
		}
	}),
	
	// section
	Part: EnvironmentStyler.extend({
		environment: 'Part',
		generateStyleNode: function (document, options) {
			return document.createElement('h1');
		}
	}),
	Section: EnvironmentStyler.extend({
		environment: 'Section',
		generateStyleNode: function (document, options) {
			return document.createElement('h2');
		}
	}),
	Subsection: EnvironmentStyler.extend({
		environment: 'Subsection',
		generateStyleNode: function (document, options) {
			return document.createElement('h3');
		}
	}),
	Subsubsection: EnvironmentStyler.extend({
		environment: 'Subsubsection',
		generateStyleNode: function (document, options) {
			return document.createElement('h4');
		}
	}),
	Paragraph: EnvironmentStyler.extend({
		environment: 'Paragraph',
		generateStyleNode: function (document, options) {
			return document.createElement('p');
		}
	}),
	Subparagraph: EnvironmentStyler.extend({
		environment: 'Subparagraph',
		generateStyleNode: function (document, options) {
			return document.createElement('p');
		}
	})
};

var fonts = {
	Bold: BoldStyler.extend({
		generateStyleNode: function (document, options) {
			var node = this.base(document, options);
			node.setAttribute('class', 'onlyx-font-Bold');
			node.setAttribute('data-onlyx-type', 'font');
			node.setAttribute('data-onlyx-font', 'Bold');
			node.setAttribute('data-onlyx-serializer', 'font-Bold');
			return node;
		}
	})
}
 
/*
  initialization
 */

base2.DOM.bind(document);
window.onload = function () {
	// get editor
	var editorNode = document.querySelector('#editor');
	var editorWindow = editorNode.contentWindow;
	var editorDocument = base2.DOM.bind(editorWindow.document);
	
	// make editor
	var editor = new Editable(editorDocument.querySelector('body'), editorWindow);
	editor.focus();
	
	editor.getNode().innerHTML = '<p class="onlyx-environment-Standard" data-onlyx-type="enviroment" data-onlyx-environment="Standard" data-onlyx-serializer="environment-Standard">Welcome to OnLyX!</p>';
	
	/*
	  environments
	 */
	 
	// reset environments list
	var environmentsList = document.querySelector('#environments');
	environmentsList.selectedIndex = 0;
	environmentsList.addEventListener('change', function (e) {
		// convert current environment
		var styler = new environments[this.value](editorDocument);
		(new BlockStyleCommand(editor, styler)).execute();
		editor.focus();
	}, false);
	
	document.querySelector('#output').addEventListener('click', function () {
		console.log((new Serializer()).serializeChildren(editor.getNode()));
	}, false);
	
	// bold button
	document.querySelector('#bold').addEventListener('click', function () {
		(new InlineStyleCommand(editor, new fonts.Bold(editorDocument))).execute();
	}, false);
	
	function getCurrentEnvironment() {
		var sel = editor.getSelection();
		if (!sel)
			return;
		
		var node = sel.endContainer;
		while (node && (!node.hasAttribute || !node.hasAttribute('data-onlyx-environment')))
			node = node.parentNode;
		if (node) {
			var type = node.getAttribute('data-onlyx-environment');
			for (var i = 0; i < environmentsList.options.length; i++)
				if (environmentsList.options[i].value == type)
					environmentsList.selectedIndex = i;
		}
	}
	
	editor.getNode().addEventListener('keypress', getCurrentEnvironment, false);
	editor.getNode().addEventListener('mouseup', getCurrentEnvironment, false);
}