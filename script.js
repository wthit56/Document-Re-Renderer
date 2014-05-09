var input, outputPreview, output;
window.addEventListener("load", function () {
	var scroll = (function () {
		var amount, boxes, window;
		function scroll(source) {
			scroll.allow = false;

			if (source.nodeType === 1) {
				amount = source.scrollTop / (source.scrollHeight - source.offsetHeight);
			}
			else {
				window = source.defaultView || source.parentWindow;
				amount = window.scrollY / (source.body.scrollHeight - window.innerHeight);
				source = window; window = null;
			}

			if (isNaN(amount)) {
				console.error("invalid amount");
				return;
			}

			for (var i = 0; i < 3; i++) {
				if (boxes[i] !== source) {
					if (boxes[i].scrollTo) {
						boxes[i].scrollTo(
							boxes[i].scrollX,
							(boxes[i].document.body.scrollHeight - boxes[i].innerHeight) * amount
						);
					}
					else {
						boxes[i].scrollTop = (boxes[i].scrollHeight - boxes[i].clientHeight) * amount
					}
				}
			}
			setTimeout(allowScroll, 1);
		}
		scroll.allow = true;
		scroll.event = function scrollEvent(e) {
			if (scroll.allow) { scroll(e.target || e.srcElement); }
		}
		boxes = scroll.boxes = [];

		function allowScroll() {
			scroll.allow = true;
		}

		return scroll;
	})();

	input = document.getElementById("input");
	input.controls = document.getElementById("input-controls");
	input.contentWindow.onscroll = scroll.event;
	scroll.boxes.push(input.contentWindow);

	outputPreview = document.getElementById("output-preview");
	outputPreview.contentWindow.onscroll = scroll.event;
	outputPreview.contentDocument.body.style.margin = "10px";
	scroll.boxes.push(outputPreview.contentWindow);

	var load = (function () {
		var cookie, from, to;
		return function load(field) {
			cookie = document.cookie;

			from = cookie.indexOf(field.id + "=");
			if (from === -1) { return; }
			from += field.id.length + 1;

			to = cookie.indexOf(";", from);
			if (to === -1) { to = cookie.length; }

			if (field.type === "checkbox") {
				field.checked = (cookie.substring(from, to) !== "false");
			}
			else {
				field.value = cookie.substring(from, to);
			}

			save(field);
			cookie = null;
		}
	})();
	function save(field) {
		document.cookie = (
			field.id + "=" + ((field.type === "checkbox") ? field.checked : field.value) + ";" +
			"expires=" + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toGMTString()
		);
	}

	var markup = {
		"para-before": "\n<p>", "para-after": "</p>\n",
		"bold-before": "<strong>", "bold-after": "</strong>",
		"underlined-before": "<u>", "underlined-after": "</u>",
		"italic-before": "<em>", "italic-after": "</em>",
		"break": "\n<hr />\n",
		fromInput: (function () {
			var findToEscape = /"|\\(?!['"\\ntbfu])/g;
			return function (input) {
				return (this[input.id] = JSON.parse("\"" + input.value.replace(findToEscape, "\\$&") + "\""));
			};
		})()
	};
	function render() {
		output.value = content.map(function (part) {
			switch (part) {
				case breakObject:
					return markup["break"];
				default:
					return markup["para-before"] + part.map(function (text) {
						return (
							(text.B ? markup["bold-before"] : "") +
							(text.U ? markup["underlined-before"] : "") +
							(text.I ? markup["italic-before"] : "") +
							text.text +
							(text.I ? markup["italic-after"] : "") +
							(text.U ? markup["underlined-after"] : "") +
							(text.B ? markup["bold-after"] : "")
						);
					}).join("") + markup["para-after"];
			}
		}).join("");
	}

	var output = (function () {
		var output = document.getElementById("output");
		output.onscroll = scroll.event;
		scroll.boxes.push(output);

		var month = 30 * 24 * 60 * 60 * 1000;
		var maxWidth;
		var controls = output.controls = (function () {
			var controls = document.getElementById("output-controls");
			var height, h;

			var auto = {
				save: document.getElementById("output-save-auto"),
				render: document.getElementById("output-render-auto")
			};
			load(auto.save); load(auto.render);
			auto.save.onchange = auto.render.onchange = function (e) {
				save(e.target || e.srcElement);
			};

			var proxy = document.getElementById("option-proxy"), newWidth;

			function resizeOption(option) {
				proxy.style.display = "inline-block";
				proxy.innerText = option.value;
				option.style.width = proxy.offsetWidth + "px";
				proxy.style.display = "none";
				if ((h = controls.offsetHeight) !== height) {
					resize.outputHeight();
					height = h;
				}
			}

			function change(option) {
				if (option.value === option.oldValue) { return; }

				resizeOption(option);

				markup.fromInput(option);
				if (auto.save.checked) { save(option); }

				option.oldValue = option.value;
			}
			change.debounce = (function () {
				var scheduled = null, options = [];
				function doChange() {
					var option;
					while (option = options.pop()) {
						change(option);
					}
					if (auto.render.checked) { render(); }

					scheduled = null;
				}
				return function (option) {
					if (options.indexOf(option) === -1) { options.push(option); }
					if (scheduled === null) {
						scheduled = setTimeout(doChange, 0);
					}
				}
			})();
			change.event = function changeEvent(e) {
				change.debounce(e.target || e.srcElement);
			};

			var options = controls.options = document.getElementById("output-controls-markup").getElementsByTagName("INPUT");
			for (var i = 0, l = options.length; i < l; i++) {
				load(options[i]);
				options[i].oldValue = options[i].value;
				markup.fromInput(options[i]);

				proxy.innerText = options[i].value;
				options[i].style.width = proxy.offsetWidth + "px";
				options[i].onchange = options[i].onkeyup = options[i].onkeydown = change.event;
			}
			proxy.style.display = "none";
			height = controls.offsetHeight;

			return controls;
		})();

		return output;
	})();

	var content = [], breakObject = { is: "break" };
	document.getElementById("input-analyse").onclick = (function () {
		var isWhitespace = /^\s*$/, isSpace = /^(?:\s*(?:&nbsp;)*(?:<br(?: \/)?>)*)+$/,
			isBreak = /^\s*(?:[*#~=-]+\s*)+$/;
		var text, html;
		function parse(element) {
			html = element.innerHTML;
			if (isWhitespace.test(html)) { return; }
			else {
				var style = window.getComputedStyle(element);
				if (style.display === "block") {
					if (isSpace.test(html)) { pendingBreak(); }
					else { pendingPara(); }
				}

				var childNodes = element.childNodes, child;
				for (var i = 0, l = childNodes.length; i < l; i++) {
					child = childNodes[i];
					if (child.nodeType === 3) {
						text = child.textContent;
						if (!isWhitespace.test(text) && !isSpace.test(text)) {
							if (isBreak.test(text)) {
								pendingBreak();
							}
							else {
								addText(text, style);
							}
						}
					}
					else if (child.tagName === "BR") {
						pendingPara();
					}
					else if (child.tagName === "HR") {
						pendingBreak();
					}
					else {
						parse(child);
					}
				}

				if (style.display === "block") {
					pendingPara();
				}
			}
		}

		function pendingBreak() {
			if (content.last) {
				pendingBreak.is = true;
			}
		} pendingBreak.is = false;
		function pendingPara() {
			if (!content.last || content.last.length) {
				pendingPara.is = true;
			}
		} pendingPara.is = false;

		var addText = (function () {
			var B, U, I;
			var lastText;
			var hasUnderline = /(?:^|\s)underline(?:\s|$)/i,
				findLeadingWhitespace = /^(?:\s+|&nbsp;)+/,
				findTrailingWhitespace = /(?:\s+|&nbsp;)+$/,
				findSpace = /(?:\s+|&nbsp;)+/;
			return function addText(text, style) {
				if (
					(pendingBreak.is || pendingPara.is) &&
					content.last && (lastText = content.last.last)
				) {
					lastText.text = lastText.text.replace(findTrailingWhitespace, "");
					lastText = null;
				}

				var breakd = pendingBreak.is;
				if (pendingBreak.is) {
					content.push(breakObject);
					pendingBreak.is = false;
				}
				if (breakd || pendingPara.is || !content.last) {
					if (content.last) { delete content.last.last; }
					content.push(content.last = []);
					pendingPara.is = false;
				}

				B = (style.fontWeight !== "normal");
				U = hasUnderline.test(style.textDecoration);
				I = (style.fontStyle === "italic");

				if (!content.last.last) {
					text.replace(findLeadingWhitespace, "");
				}
				text.replace(findSpace, " ");

				if (
					content.last && (lastText = content.last.last) &&
					((lastText.B === B) && (lastText.U === U) && (lastText.I === I))
				) {
					lastText.text += text;
					lastText = null;
				}
				else {
					content.last.push(content.last.last = {
						text: text,
						B: B, U: U, I: I
					});
				}
			};
		})();

		return function () {
			content.length = 0;
			parse(input.contentDocument.body);
			delete content.last;
			pendingBreak.is = pendingPara.is = false;

			outputPreview.contentDocument.body.innerHTML = content.map(function (part) {
				switch (part) {
					case breakObject:
						return "<hr />";
					default:
						return "<p>" + part.map(function (text) {
							return (
								(text.B ? "<strong>" : "") +
								(text.U ? "<u>" : "") +
								(text.I ? "<em>" : "") +
								text.text +
								(text.I ? "</em>" : "") +
								(text.U ? "</u>" : "") +
								(text.B ? "</strong>" : "")
							);
						}).join("") + "</p>";
				}
			}).join("\n");

			render();

			scroll(outputPreview.contentDocument);
		};
	})();

	document.getElementById("input-clear").onclick = function () {
		input.contentDocument.body.innerHTML = "";
		outputPreview.contentDocument.body.innerHTML = "";
		output.value = "";
	};

	var scrollbarWidth = (function () {
		var div = document.createElement("DIV");
		div.style.cssText = "position:absolute; overflow:scroll;";
		document.body.appendChild(div);
		var width = div.offsetWidth - div.clientWidth;
		document.body.removeChild(div);
		return width;
	})();

	var resize = (function () {
		var padding = 10;
		var width, height, i, o, l;

		var inputHeight, outputPreviewHeight, outputHeight;
		function resize1() {
			outputPreview.parentNode.style.width = "10px";
			width = ((window.innerWidth / 3) - 21) | 0;
			input.parentNode.style.width = output.parentNode.style.width = width + "px";

			height = window.innerHeight - input.parentNode.offsetTop - 20;
			if (height < 300) { height = 300; }

			input.parentNode.style.height = outputPreview.parentNode.style.height = output.parentNode.style.height = height + "px";

			inputHeight = height - (input.offsetTop - padding) - input.controls.offsetHeight;
			outputPreviewHeight = height - (outputPreview.offsetTop - padding);
			outputHeight = height - (output.offsetTop - padding) - output.controls.offsetHeight;

			input.style.height = inputHeight + "px";
			outputPreview.style.height = outputPreviewHeight + "px";
			output.style.height = outputHeight + "px";
			outputPreview.parentNode.style.width = (width + (document.body.scrollHeight > window.innerHeight ? -scrollbarWidth : 0)) + "px";
		}
		function resize2() {
			var optionMaxWidth = width - 2, optionMaxWidthPX = optionMaxWidth + "px";
			for (i = 0, l = output.controls.options.length - 1; i < l; i++) {
				o = output.controls.options[i];
				o.style.maxWidth = optionMaxWidthPX;
			}
			o = null;
			output.controls.options[output.controls.options.length - 1].style.maxWidth = (optionMaxWidth - 40) + "px";
		}
		resize1(); resize2();

		var resizeOutputHeight = (function () {
			var newHeight;
			return function resizeOutputHeight() {
				newHeight = output.controls.offsetHeight;
				if (newHeight === resizeOutputHeight.oldHeight) { return; }
				resizeOutputHeight.oldHeight = newHeight;

				outputPreview.parentNode.style.width = "10px";
				output.style.height = (height - (output.offsetTop - padding) - newHeight) + "px";
				outputPreview.parentNode.style.width = (width + (document.body.scrollHeight > window.innerHeight ? -scrollbarWidth : 0)) + "px";
			};
		})();

		var scheduled;
		function scheduled2() {
			scheduled = null;
			resize2();
		}

		window.addEventListener("resize", function () {
			resize1();
			if (!scheduled) { scheduled = setTimeout(scheduled2, 10); }
		});

		return { outputHeight: resizeOutputHeight };
	})();

	document.getElementById("output-save").addEventListener("click", function (e) {
		var options = output.controls.options;
		for (var i = 0, l = options.length; i < l; i++) {
			save(options[i]);
		}
	});

	document.getElementById("output-render").addEventListener("click", output.controls.onsubmit= function (e) {
		e.preventDefault();
		render(); scroll(output);
		return false;
	});
});
/*
var input = document.getElementById("input"),
	outputPreview = document.getElementById("output-preview"),
	output = document.getElementById("output");
*/