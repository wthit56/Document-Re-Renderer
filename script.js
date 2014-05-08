var input;
window.addEventListener("load", function () {
	input = document.getElementById("input");
	input.controls = document.getElementById("input-controls");
	input.contentWindow.onscroll = scroll;

	var outputPreview = document.getElementById("output-preview");
	outputPreview.contentWindow.onscroll = scroll;
	outputPreview.contentDocument.body.style.margin = "10px";

	var output = document.getElementById("output");
	output.onscroll = scroll;

	var toScroll = [
		input.contentWindow,
		outputPreview.contentWindow,
		output
	];
	var doScroll = true, amount;
	function scroll(e) {
		if (!doScroll) { return; }
		doScroll = false;

		var target = e.target || e.srcElement, window;
		if (target.nodeType === 1) {
			amount = target.scrollTop / (target.scrollHeight - target.offsetHeight);
		}
		else {
			window = target.defaultView || target.parentWindow;
			amount = window.scrollY / (target.body.scrollHeight - window.innerHeight);
			target = window;
		}

		if (isNaN(amount)) {
			console.error("invalid amount");
			return;
		}

		for (var i = 0; i < 3; i++) {
			if (toScroll[i] !== target) {
				if (toScroll[i].scrollTo) {
					toScroll[i].scrollTo(
						toScroll[i].scrollX,
						(toScroll[i].document.body.scrollHeight - toScroll[i].innerHeight) * amount
					);
				}
				else {
					toScroll[i].scrollTop = (toScroll[i].scrollHeight - toScroll[i].clientHeight) * amount
				}
			}
		}
		setTimeout(function () { doScroll = true; }, 1);
	}

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

		var paraBefore = document.getElementById("para-before"),
			paraAfter = document.getElementById("para-after"),
			boldBefore = document.getElementById("bold-before"),
			boldAfter = document.getElementById("bold-after"),
			underlinedBefore = document.getElementById("underlined-before"),
			underlinedAfter = document.getElementById("underlined-after"),
			italicBefore = document.getElementById("italic-before"),
			italicAfter = document.getElementById("italic-after"),
			breakOption = document.getElementById("break");

		var toString = (function () {
			var findQuotes = /"/g;
			return function toString(string) {
				return JSON.parse("\"" + string.replace(findQuotes, "\\\"") + "\"");
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

			output.value = content.map(function (part) {
				switch (part) {
					case breakObject:
						return toString(breakOption.value);
					default:
						return toString(paraBefore.value) + part.map(function (text) {
							return (
								(text.B ? toString(boldBefore.value) : "") +
								(text.U ? toString(underlinedBefore.value) : "") +
								(text.I ? toString(italicBefore.value) : "") +
								text.text +
								(text.I ? toString(italicAfter.value) : "") +
								(text.U ? toString(underlinedAfter.value) : "") +
								(text.B ? toString(boldAfter.value) : "")
							);
						}).join("") + toString(paraAfter.value);
				}
			}).join("");
		};
	})();

	document.getElementById("input-clear").onclick = function () {
		input.contentDocument.body.innerHTML = "";
		outputPreview.contentDocument.body.innerHTML = "";
		output.value = "";
	};

	var output = (function () {
		var output = document.getElementById("output");
		
		var maxWidth;
		var controls = output.controls = (function () {
			var controls = document.getElementById("output-controls");
			var height, h;

			var proxy = document.getElementById("option-proxy"), newWidth;
			function changeEvent(e) {
				var option = e.target || e.srcElement;
				proxy.style.display = "inline-block";
				proxy.innerText = option.value;
				option.style.width = proxy.offsetWidth + "px";
				proxy.style.display = "none";
				if ((h = controls.offsetHeight) !== height) {
					resize.outputHeight();
					height = h;
				}
			}

			var options = controls.options = document.getElementById("output-controls-markup").getElementsByTagName("INPUT");
			for (var i = 0, l = options.length; i < l; i++) {
				proxy.innerText = options[i].value;
				options[i].style.width = proxy.offsetWidth + "px";
				options[i].onchange = options[i].onkeyup = options[i].onkeydown = changeEvent;
			}
			proxy.style.display = "none";

			height = controls.offsetHeight;

			return controls;
		})();

		return output;
	})();

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
		var winWidth, width, height, i, o, l;
		var inputHeight, outputPreviewHeight, outputHeight;
		function resizeWidth() {
			outputPreview.parentNode.style.width = "10px";
			width = ((window.innerWidth / 3) - 21) | 0;
			input.parentNode.style.width = output.parentNode.style.width = width + "px";
			outputPreview.parentNode.style.width = (width + (document.body.scrollHeight > window.innerHeight ? -scrollbarWidth : 0)) + "px";
		}
		function resizeHeight() {
			height = window.innerHeight - input.parentNode.offsetTop - 20;
			if (height < 300) { height = 300; }

			input.parentNode.style.height = outputPreview.parentNode.style.height = output.parentNode.style.height = height + "px";

			inputHeight = height - (input.offsetTop - padding) - input.controls.offsetHeight;
			outputPreviewHeight = height - (outputPreview.offsetTop - padding);
			outputHeight = height - (output.offsetTop - padding) - output.controls.offsetHeight;

			input.style.height = inputHeight + "px";
			outputPreview.style.height = outputPreviewHeight + "px";
			output.style.height = outputHeight + "px";

			var optionMaxWidth = width - 2, optionMaxWidthPX = optionMaxWidth + "px";
			for (i = 0, o, l = output.controls.options.length - 1; i < l; i++) {
				o = output.controls.options[i];
				o.style.maxWidth = optionMaxWidthPX;
			}
			output.controls.options[output.controls.options.length - 1].style.maxWidth = (optionMaxWidth - 40) + "px";
		}
		resizeWidth(); resizeHeight();

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
		function scheduledHeight() {
			scheduled = null;
			resizeHeight();
		}

		window.addEventListener("resize", function () {
			resizeWidth();
			if (!scheduled) { scheduled = setTimeout(scheduledHeight, 10); }
		});

		return { width: resizeWidth, height: resizeHeight, outputHeight: resizeOutputHeight };
	})();

});
/*
var input = document.getElementById("input"),
	outputPreview = document.getElementById("output-preview"),
	output = document.getElementById("output");
*/