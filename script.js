var input;
window.addEventListener("load", function () {
	input = document.getElementById("input");
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
		var isWhitespace = /^\s*$/, isSpace = /^(?:\s*(?:&nbsp;)+)+$/,
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
					console.log(child.innerText);
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
					//console.log(
					//	"Append to previous text; " +
					//	(B ? "B" : "") + (U ? "U" : "") + (I ? "I" : "") +
					//	" " + JSON.stringify(text)
					//);
					lastText.text += text;
					lastText = null;
				}
				else {
					//console.log(
					//	"Add new text; " +
					//	(B ? "B" : "") + (U ? "U" : "") + (I ? "I" : "") +
					//	" " + JSON.stringify(text)
					//);
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

			output.value = content.map(function (part) {
				switch (part) {
					case breakObject:
						return "\n==========\n";
					default:
						return "\n" + part.map(function (text) {
							return (
								(text.B ? "**" : "") +
								(text.U ? "<u>" : "") +
								(text.I ? "_" : "") +
								text.text +
								(text.I ? "_" : "") +
								(text.U ? "</u>" : "") +
								(text.B ? "**" : "")
							);
						}).join("") + "\n";
				}
			}).join("");
		};
	})();

	document.getElementById("input-clear").onclick = function () {
		input.contentDocument.body.innerHTML = "";
		outputPreview.contentDocument.body.innerHTML = "";
		output.value = "";
	};

	window.addEventListener("resize", (function () {
		var fieldsets = document.getElementsByTagName("FIELDSET");

		fieldsets[0].controls = document.getElementById("input-controls");
		fieldsets[0].display = document.getElementById("input");
		var gap = fieldsets[0].controls.offsetTop - (fieldsets[0].display.offsetTop + fieldsets[0].display.offsetHeight);

		fieldsets[1].display = document.getElementById("output-preview");

		fieldsets[2].display = document.getElementById("output");
		fieldsets[2].controls = document.getElementById("output-controls");

		var width, height;
		function resize() {
			document.body.style.overflow = "hidden";
			width = ((window.innerWidth / 3) - 21);
			fieldsets[0].style.width = fieldsets[1].style.width = fieldsets[2].style.width = width + "px";
			height = (window.innerHeight - fieldsets[0].offsetTop - 20);
			fieldsets[0].style.height = fieldsets[1].style.height = fieldsets[2].style.height = height + "px";

			fieldsets[0].display.style.height = (height - fieldsets[0].controls.offsetHeight - gap - 20) + "px";
			fieldsets[1].display.style.height = (height - fieldsets[1].display.offsetTop + 10) + "px";
			fieldsets[2].display.style.height = (height - fieldsets[2].controls.offsetHeight - gap - 20) + "px";

			document.body.style.overflow = "auto";
		}
		resize();

		return resize;
	})());

});
