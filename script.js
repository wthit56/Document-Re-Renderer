var input;
window.addEventListener("load", function () {
	input = document.getElementById("input");

	input.url = (function () {
		var url = document.getElementById("input-url");

		var path = url.path = document.getElementById("input-url-path");
		var domain = url.domain = document.getElementById("input-url-domain");
		var origin = domain.innerText = window.location.origin + "/";

		var abs = url.absolute=(function(){
			var findHttp = /^https?:\/\//;
			var turnOn = "Check to use Absolute Url (CORS enabled)",
				turnOff = "Uncheck to use Relative Url (within domain)";

			var abs = url.absolute = document.getElementById("input-url-absolute");
			abs.title = turnOn;
			abs.onchange = function () {
				if (this.checked) {
					domain.style.display = "none";
					if (!findHttp.test(path.value)) { path.value = "http://" + path.value; }
					abs.title = turnOff;
				}
				else {
					domain.style.display = "inline";
					path.value = path.value.replace(findHttp, "");
					abs.title = turnOn;
				}
			};

			return abs;
		})();

		var src, pathEnd;
		url.onsubmit = function (e) {
			e.preventDefault();

			src = (abs.checked ? "" : origin) + path.value;
			if (src.indexOf(origin) === 0) {
				pathEnd = src.indexOf("#", origin.length);
				if (pathEnd === -1) { pathEnd = src.indexOf("?", origin.length); }
				if (pathEnd === -1) { pathEnd = src.length; }

				switch (src.substring(origin.length, pathEnd)) {
					case "":
					case "index.html":
					case "input-placeholder.html":
						alert("The url '" + src + "' is not a valid url.");
						return false;
				}
			}

			input.src = src;
			return false;
		};

		return url;
	})();

	var content = [], breakObject = { is: "break" };
	input.onload = (function () {
		var isWhitespace = /^\s*$/, isSpace = /^(?:\s*(?:&nbsp;)+)+$/;
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
							addText(text, style);
						}
					}
					else if (child.tagName === "BR") {
						pendingPara();
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

		var inputSelector = "#content";
		return function () {
			try { input.contentDocument; }
			catch (error) {
				alert("Could not access '" + input.src + "'; make sure it is in the same domain, or has CORS enabled.");
				return;
			}

			content.length = 0;
			parse(inputSelector ? input.contentDocument.querySelector(inputSelector):input.contentDocument.body);
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
			
			output.value = input.contentDocument.body.innerText;

			input.contentWindow.onscroll = scroll;
		};
	})();
	input.src = "test.html";

	var outputPreview = document.getElementById("output-preview");
	outputPreview.contentWindow.onscroll = scroll;

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
			debugger;
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
});